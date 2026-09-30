package top.hxzmc.community;
import android.app.Activity;
import android.os.Bundle;
import android.graphics.Color;
import android.net.Uri;
import android.view.*;
import android.webkit.*;
import android.widget.*;

/** No native bridge, community token, file chooser, or automatic credential submission. */
public final class NeteaseActivity extends Activity {
    private WebView web;
    private static boolean allowed(Uri uri){String host=uri.getHost();return "https".equals(uri.getScheme())&&("music.163.com".equals(host)||"y.music.163.com".equals(host)||"reg.163.com".equals(host)||"dl.reg.163.com".equals(host));}
    @Override public void onCreate(Bundle saved){super.onCreate(saved);LinearLayout root=new LinearLayout(this);root.setOrientation(LinearLayout.VERTICAL);root.setBackgroundColor(Color.rgb(244,246,251));LinearLayout bar=new LinearLayout(this);Button back=new Button(this);back.setText("返回社区");back.setOnClickListener(v->finish());bar.addView(back);TextView title=new TextView(this);title.setText("网易云音乐 · 个人账号");title.setTextColor(Color.rgb(35,48,72));title.setGravity(Gravity.CENTER_VERTICAL);bar.addView(title,new LinearLayout.LayoutParams(0,-1,1));root.addView(bar,new LinearLayout.LayoutParams(-1,(int)(56*getResources().getDisplayMetrics().density)));
        web=new WebView(this);WebSettings s=web.getSettings();s.setJavaScriptEnabled(true);s.setDomStorageEnabled(true);s.setAllowFileAccess(false);s.setAllowContentAccess(false);s.setMixedContentMode(WebSettings.MIXED_CONTENT_NEVER_ALLOW);s.setUserAgentString(s.getUserAgentString().replace("; wv","").replace("Version/4.0 ",""));CookieManager.getInstance().setAcceptThirdPartyCookies(web,false);
        web.setWebViewClient(new WebViewClient(){@Override public boolean shouldOverrideUrlLoading(WebView v,WebResourceRequest request){return !allowed(request.getUrl());}@Override public void onPageFinished(WebView v,String url){CookieManager.getInstance().flush();}});web.setWebChromeClient(new WebChromeClient(){@Override public void onPermissionRequest(PermissionRequest request){request.deny();}});
        root.addView(web,new LinearLayout.LayoutParams(-1,0,1));setContentView(root);if(android.os.Build.VERSION.SDK_INT>=30){getWindow().setDecorFitsSystemWindows(false);root.setOnApplyWindowInsetsListener((v,insets)->{android.graphics.Insets b=insets.getInsets(WindowInsets.Type.systemBars()|WindowInsets.Type.displayCutout()),ime=insets.getInsets(WindowInsets.Type.ime());v.setPadding(b.left,b.top,b.right,Math.max(b.bottom,ime.bottom));return insets;});}web.loadUrl(NeteaseSession.ORIGIN+"/#/my");
    }
    @Override public void onBackPressed(){if(web.canGoBack())web.goBack();else finish();}
    @Override protected void onDestroy(){CookieManager.getInstance().flush();web.destroy();super.onDestroy();}
}
