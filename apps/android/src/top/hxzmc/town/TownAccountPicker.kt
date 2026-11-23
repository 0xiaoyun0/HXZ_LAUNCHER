package top.hxzmc.town

import android.app.AlertDialog
import android.graphics.Color
import android.graphics.drawable.GradientDrawable
import android.text.InputType
import android.view.View
import android.view.WindowManager
import android.view.inputmethod.EditorInfo
import android.widget.EditText
import android.widget.LinearLayout
import android.widget.TextView
import androidx.lifecycle.lifecycleScope
import com.tungsten.fcl.setting.Accounts
import com.tungsten.fcl.setting.ConfigHolder
import com.tungsten.fclcore.auth.CharacterSelector
import com.tungsten.fclcore.auth.NoSelectedCharacterException
import com.tungsten.fclcore.auth.yggdrasil.GameProfile
import kotlinx.coroutines.*
import kotlin.coroutines.resume
import kotlin.math.roundToInt

/** Only this native dialog sees the username and password. The web page receives the public role. */
object TownAccountPicker {
    fun show(activity: TownCommunityActivity, done: (Boolean) -> Unit) {
        val saved=TownSession.saved()
        if(saved.isEmpty()){login(activity,done);return}
        AlertDialog.Builder(activity).setTitle("幻想镇皮肤站角色")
            .setItems((saved.map{it.character}+"登录或重新验证账号").toTypedArray()){_,i->
                if(i==saved.size)login(activity,done) else {
                    Accounts.setSelectedAccount(saved[i]);TownSession.remember(activity);done(true)
                }
            }.setNegativeButton("取消"){_,_->done(false)}.setOnCancelListener{done(false)}.show()
    }

    private fun login(activity:TownCommunityActivity,done:(Boolean)->Unit) {
        fun dp(n:Int)=(n*activity.resources.displayMetrics.density).roundToInt()
        val fields=LinearLayout(activity).apply{orientation=LinearLayout.VERTICAL;setPadding(dp(24),dp(12),dp(24),dp(4))}
        fun field(label:String,type:Int,hint:String):EditText {
            fields.addView(TextView(activity).apply{text=label;labelFor=View.NO_ID;setPadding(0,dp(8),0,dp(4))})
            return EditText(activity).apply{
                id=View.generateViewId();(fields.getChildAt(fields.childCount-1) as TextView).labelFor=id
                setSingleLine();inputType=type;setHint(hint);setTextColor(Color.rgb(32,42,68));textSize=16f
                background=GradientDrawable().apply{setColor(Color.WHITE);cornerRadius=dp(9).toFloat();setStroke(dp(1),Color.rgb(194,202,221))}
                setPadding(dp(12),dp(9),dp(12),dp(9));minimumHeight=dp(46)
                imeOptions=imeOptions or EditorInfo.IME_FLAG_NO_EXTRACT_UI
                fields.addView(this)
            }
        }
        val user=field("皮肤站账号",InputType.TYPE_CLASS_TEXT or InputType.TYPE_TEXT_VARIATION_EMAIL_ADDRESS,"邮箱或用户名")
        val password=field("密码",InputType.TYPE_CLASS_TEXT or InputType.TYPE_TEXT_VARIATION_PASSWORD,"输入皮肤站密码")
        if(android.os.Build.VERSION.SDK_INT>=26){user.setAutofillHints(View.AUTOFILL_HINT_USERNAME);password.setAutofillHints(View.AUTOFILL_HINT_PASSWORD)}
        val info=TextView(activity).apply{setPadding(0,dp(12),0,dp(4));setTextColor(Color.rgb(74,86,114));accessibilityLiveRegion=View.ACCESSIBILITY_LIVE_REGION_POLITE}
        fields.addView(info)
        val dialog=AlertDialog.Builder(activity).setTitle("登录幻想镇皮肤站").setView(android.widget.ScrollView(activity).apply{addView(fields)})
            .setPositiveButton("登录",null).setNegativeButton("取消",null).create()
        var chosen=false;var work:Job?=null
        dialog.setOnDismissListener {work?.cancel();password.text.clear();done(chosen)}
        dialog.window?.addFlags(WindowManager.LayoutParams.FLAG_SECURE)
        dialog.show()
        dialog.window?.addFlags(WindowManager.LayoutParams.FLAG_SECURE)
        val submit=dialog.getButton(AlertDialog.BUTTON_POSITIVE)
        submit.setOnClickListener {
            val name=user.text.toString().trim();val secret=password.text.toString()
            if(name.isEmpty()||secret.isEmpty()){info.text="请填写皮肤站账号和密码。";return@setOnClickListener}
            submit.isEnabled=false;info.text="正在验证皮肤站账号…"
            work=activity.lifecycleScope.launch {
                try {
                    val server=ConfigHolder.config().authlibInjectorServers.first{it.url.trimEnd('/')==TownSession.SKIN}
                    val selector=CharacterSelector { _,roles ->
                        if(roles.size==1)roles.first() else runBlocking { withContext(Dispatchers.Main) { pickRole(activity,roles) } }
                    }
                    val account=runInterruptible(Dispatchers.IO){Accounts.getAccountFactoryByAuthlibInjectorServer(server).create(selector,name,secret,null,server)}
                    Accounts.addAccount(account);Accounts.setSelectedAccount(account);TownSession.remember(activity)
                    chosen=true;dialog.dismiss()
                }catch(e:CancellationException){throw e}
                catch(e:Exception){
                    info.text=when {
                        e is NoSelectedCharacterException -> "已取消选择角色。"
                        generateSequence<Throwable>(e){it.cause}.any{it is java.io.IOException} -> "暂时无法连接皮肤站，请检查网络后重试。"
                        else -> Accounts.localizeErrorMessage(activity,e).takeIf{it.isNotBlank()&&it.length<=160&&!it.contains("://")} ?: "皮肤站没有接受本次登录，请检查账号、密码和角色。"
                    }
                }finally{if(dialog.isShowing)submit.isEnabled=true}
            }
        }
        password.setOnEditorActionListener {_,action,_->if(action==EditorInfo.IME_ACTION_DONE&&submit.isEnabled){submit.performClick();true}else false}
    }
    private suspend fun pickRole(activity:TownCommunityActivity,profiles:List<GameProfile>):GameProfile =
        suspendCancellableCoroutine { result ->
            if(profiles.isEmpty()){result.cancel(NoSelectedCharacterException());return@suspendCancellableCoroutine}
            val pick=AlertDialog.Builder(activity).setTitle("选择本次使用的角色")
                .setItems(profiles.map{it.name}.toTypedArray()){_,i->if(result.isActive)result.resume(profiles[i])}
                .setNegativeButton("取消"){_,_->result.cancel(NoSelectedCharacterException())}
                .setOnCancelListener{result.cancel(NoSelectedCharacterException())}.show()
            result.invokeOnCancellation{activity.runOnUiThread{pick.dismiss()}}
        }
}
