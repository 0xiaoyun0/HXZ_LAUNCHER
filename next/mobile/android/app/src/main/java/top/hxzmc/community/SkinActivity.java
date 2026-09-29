package top.hxzmc.community;
import android.app.Activity;
import android.os.Bundle;
import android.content.Intent;
import android.graphics.Color;
import android.net.Uri;
import android.view.*;
import android.webkit.*;
import android.widget.*;
/** Remote website has no native bridge, file access or community credentials. */
public final class SkinActivity extends Activity {
    private WebView web;private ValueCallback<Uri[]> upload;
    @Override public void onCreate(Bundle state){super.onCreate(state);
        LinearLayout root=new LinearLayout(this);root.setOrientation(LinearLayout.VERTICAL);root.setBackgroundColor(Color.rgb(245,246,241));
        LinearLayout bar=new LinearLayout(this);Button back=new Button(this);back.setText("返回社区");back.setOnClickListener(v->finish());bar.addView(back);TextView title=new TextView(this);title.setText("皮肤站账号管理");title.setTextSize(17);title.setTextColor(Color.rgb(32,48,38));title.setGravity(Gravity.CENTER_VERTICAL);bar.addView(title,new LinearLayout.LayoutParams(0,-1,1));root.addView(bar,new LinearLayout.LayoutParams(-1,(int)(56*getResources().getDisplayMetrics().density)));
        web=new WebView(this);WebSettings s=web.getSettings();s.setJavaScriptEnabled(true);s.setDomStorageEnabled(true);s.setAllowFileAccess(false);s.setAllowContentAccess(false);s.setMixedContentMode(WebSettings.MIXED_CONTENT_NEVER_ALLOW);CookieManager.getInstance().setAcceptThirdPartyCookies(web,false);
        web.setWebViewClient(new WebViewClient(){@Override public boolean shouldOverrideUrlLoading(WebView v,WebResourceRequest r){return !SkinSession.ORIGIN.equals(r.getUrl().getScheme()+"://"+r.getUrl().getAuthority());}});
        web.setWebChromeClient(new WebChromeClient(){@Override public boolean onShowFileChooser(WebView v,ValueCallback<Uri[]> callback,FileChooserParams params){if(upload!=null)upload.onReceiveValue(null);upload=callback;try{startActivityForResult(new Intent(Intent.ACTION_OPEN_DOCUMENT).addCategory(Intent.CATEGORY_OPENABLE).setType("image/*"),1);}catch(Exception e){upload.onReceiveValue(null);upload=null;}return true;}});
        root.addView(web,new LinearLayout.LayoutParams(-1,0,1));setContentView(root);
        if(android.os.Build.VERSION.SDK_INT>=30){getWindow().setDecorFitsSystemWindows(false);root.setOnApplyWindowInsetsListener((v,insets)->{android.graphics.Insets b=insets.getInsets(WindowInsets.Type.systemBars()|WindowInsets.Type.displayCutout()),ime=insets.getInsets(WindowInsets.Type.ime());v.setPadding(b.left,b.top,b.right,Math.max(b.bottom,ime.bottom));return insets;});}
        web.loadUrl(SkinSession.ORIGIN+"/user");
    }
    @Override protected void onActivityResult(int request,int code,Intent data){super.onActivityResult(request,code,data);if(request==1&&upload!=null){upload.onReceiveValue(code==RESULT_OK&&data!=null?new Uri[]{data.getData()}:null);upload=null;}}
    @Override public void onBackPressed(){if(web.canGoBack())web.goBack();else finish();}
    @Override protected void onDestroy(){if(upload!=null)upload.onReceiveValue(null);web.destroy();super.onDestroy();}
}
