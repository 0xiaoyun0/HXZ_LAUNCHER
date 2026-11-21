package top.hxzmc.town

import android.Manifest
import androidx.fragment.app.FragmentActivity
import androidx.lifecycle.lifecycleScope
import kotlinx.coroutines.CompletableDeferred
import kotlinx.coroutines.launch
import com.tungsten.fcl.util.LegalAgreement
import android.content.Intent
import android.content.pm.PackageManager
import android.net.Uri
import android.os.Bundle
import android.webkit.*
import android.widget.Toast
import androidx.webkit.WebViewCompat
import androidx.webkit.WebViewFeature
import androidx.webkit.WebViewAssetLoader
import org.json.JSONObject
import java.io.ByteArrayInputStream
import java.util.concurrent.Executors

class TownCommunityActivity : FragmentActivity() {
    private val origin = "https://appassets.androidplatform.net"
    private lateinit var view: WebView
    private var channel: WebMessagePort? = null
    private var document = 0L
    private data class Reply(val document: Long, val post: (String) -> Unit)
    private var microphone: PermissionRequest? = null
    private var picker: ValueCallback<Array<Uri>>? = null
    private val io = Executors.newSingleThreadExecutor()
    private val publicNetwork = Executors.newFixedThreadPool(3)
    private val directory by lazy { TownDirectory(this) }
    private var choosingAccount = false
    private var packPicker: CompletableDeferred<Uri?>? = null
    private var incomingPack: Uri? = null
    private val games by lazy { TownGames(this,directory) { runOnUiThread {
        if (!isDestroyed && ::view.isInitialized) view.evaluateJavascript("window.dispatchEvent(new Event('town-game'))", null)
    } } }
    private var cached: JSONObject? = null
    private var cachedAt = 0L
    private val files by lazy { TownFiles(cacheDir) }
    private data class Save(val port: Reply, val id: Int, val document: TownFiles.Document)
    private var save: Save? = null

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        incomingPack = importUri(intent)
        window.statusBarColor = android.graphics.Color.rgb(247,248,252)
        window.decorView.systemUiVisibility = android.view.View.SYSTEM_UI_FLAG_LIGHT_STATUS_BAR
        val loader = WebViewAssetLoader.Builder().addPathHandler("/") { asset ->
            val missing = { WebResourceResponse("text/plain", "UTF-8", 404, "Missing", emptyMap(), ByteArrayInputStream(byteArrayOf())) }
            if (asset.split('/').any { it.isEmpty() || it == "." || it == ".." || it.contains('\\') }) missing()
            else try {
                val mime = when (asset.substringAfterLast('.')) {
                    "js","mjs" -> "application/javascript"
                    "css" -> "text/css"
                    "svg" -> "image/svg+xml"
                    "html" -> "text/html"
                    "wasm" -> "application/wasm"
                    else -> MimeTypeMap.getSingleton().getMimeTypeFromExtension(asset.substringAfterLast('.')) ?: "application/octet-stream"
                }
                WebResourceResponse(mime, if (mime.startsWith("text/") || mime.contains("javascript")) "UTF-8" else null, assets.open("town/" + asset))
            } catch (_: java.io.IOException) { missing() }
        }.build()
        view = WebView(this)
        setContentView(view)
        with(view.settings) {
            javaScriptEnabled = true
            domStorageEnabled = true
            allowFileAccess = false
            allowContentAccess = false
            mixedContentMode = WebSettings.MIXED_CONTENT_NEVER_ALLOW
            setSupportMultipleWindows(false)
        }
        val originBridge = WebViewFeature.isFeatureSupported(WebViewFeature.WEB_MESSAGE_LISTENER)
        if (originBridge) {
            WebViewCompat.addWebMessageListener(view, "TownNative", setOf(origin)) { _, message, source, main, sender ->
                if (main && source.toString().trimEnd('/') == origin) {
                    dispatch(Reply(document) { sender.postMessage(it) }, message.data ?: "")
                }
            }
        }
        view.webViewClient = object : WebViewClient() {
            override fun onPageStarted(v: WebView, url: String, icon: android.graphics.Bitmap?) {
                document++
                channel?.close()
                channel = null
            }
            override fun shouldInterceptRequest(v: WebView, request: WebResourceRequest) = loader.shouldInterceptRequest(request.url)
            override fun shouldOverrideUrlLoading(v: WebView, request: WebResourceRequest): Boolean {
                val url = request.url
                if (!request.isForMainFrame) return url.scheme != "https" || url.host != "appassets.androidplatform.net"
                if (url.scheme == "https" && url.host == "appassets.androidplatform.net" && url.path == "/index.html") return false
                if (request.hasGesture() && url.scheme == "https" && url.host != "appassets.androidplatform.net") openExternal(url)
                return true
            }
            override fun onPageFinished(v: WebView, url: String) {
                if (originBridge || channel != null || url.substringBefore('#') != origin + "/index.html") return
                val ports = v.createWebMessageChannel()
                channel = ports[0]
                val target = Reply(document) { ports[0].postMessage(WebMessage(it)) }
                ports[0].setWebMessageCallback(object : WebMessagePort.WebMessageCallback() {
                    override fun onMessage(sender: WebMessagePort, message: WebMessage) {
                        if (target.document == document) dispatch(target, message.data ?: "")
                    }
                })
                v.postWebMessage(WebMessage("town-port", arrayOf(ports[1])), Uri.parse(origin))
            }
        }
        view.webChromeClient = object : WebChromeClient() {
            override fun onPermissionRequest(request: PermissionRequest) {
                if (request.origin.toString().trimEnd('/') != origin || PermissionRequest.RESOURCE_AUDIO_CAPTURE !in request.resources) { request.deny(); return }
                if (checkSelfPermission(Manifest.permission.RECORD_AUDIO) == PackageManager.PERMISSION_GRANTED) request.grant(arrayOf(PermissionRequest.RESOURCE_AUDIO_CAPTURE))
                else { microphone?.deny(); microphone = request; requestPermissions(arrayOf(Manifest.permission.RECORD_AUDIO), 81) }
            }
            override fun onPermissionRequestCanceled(request: PermissionRequest) { if (microphone === request) microphone = null }
            override fun onShowFileChooser(v: WebView, result: ValueCallback<Array<Uri>>, params: FileChooserParams): Boolean {
                picker?.onReceiveValue(null); picker = result
                val intent = Intent(Intent.ACTION_OPEN_DOCUMENT).addCategory(Intent.CATEGORY_OPENABLE).setType("*/*")
                val types = params.acceptTypes.filter { it.contains('/') }.toTypedArray()
                if (types.isNotEmpty()) intent.putExtra(Intent.EXTRA_MIME_TYPES, types)
                intent.putExtra(Intent.EXTRA_ALLOW_MULTIPLE, params.mode == FileChooserParams.MODE_OPEN_MULTIPLE)
                try { startActivityForResult(intent, 82) } catch (_: android.content.ActivityNotFoundException) { picker?.onReceiveValue(null); picker = null }
                return true
            }
        }
        val lastPath = savedInstanceState?.getString("town-route")?.takeIf { it.startsWith("#/") && it.length < 800 } ?: if (incomingPack != null) "#/town/games" else "#/town"
        view.loadUrl(origin + "/index.html" + lastPath)
    }

    private fun dispatch(port: Reply, raw: String) {
        val input = runCatching { JSONObject(raw) }.getOrNull() ?: return
        val id = input.optInt("id")
        val args = input.optJSONObject("input") ?: JSONObject()
        val action = input.optString("action")
        if (action == "android.legal") { reply(port,id,LegalAgreement.isAccepted(this)); return }
        if (action == "android.legal.read") {
            val doc=if(args.optString("document")=="privacy") LegalAgreement.Document.PRIVACY_POLICY else LegalAgreement.Document.EULA
            io.execute { try { reply(port,id,LegalAgreement.load(this,doc)) } catch (_:Exception) { reply(port,id,error="无法读取随应用提供的协议。") } }
            return
        }
        if (action == "android.legal.accept") { LegalAgreement.accept(this); reply(port,id,true); return }
        if (action == "android.close") { finish(); return }
        if (!LegalAgreement.isAccepted(this)) { reply(port,id,error="阅读并同意使用协议后即可进入社区。"); return }
        when (action) {
            "android.directory" -> reply(port, id, directory.listing())
            "android.notices" -> reply(port, id, directory.news(false))
            "android.topics" -> reply(port, id, directory.topics(false))
            "android.directory.refresh", "android.notices.refresh", "android.topics.refresh" -> publicNetwork.execute {
                try { reply(port, id, when(action) {
                    "android.directory.refresh" -> directory.refresh()
                    "android.notices.refresh" -> directory.news(true)
                    else -> directory.topics(true)
                }) }
                catch (_: Exception) { reply(port, id, error = "暂时连不上社区，请稍后刷新。") }
            }
            "android.account" -> {
                if (choosingAccount) { reply(port, id, error = "正在选择角色。"); return }
                choosingAccount = true
                io.execute {
                    try {
                        TownSession.initialize(this)
                        runOnUiThread {
                            if (isFinishing || isDestroyed || port.document != document) { choosingAccount = false; return@runOnUiThread }
                            try {
                                TownAccountPicker.show(this) { chosen ->
                                    choosingAccount = false
                                    if (chosen) io.execute { cached = null; reply(port, id, TownSession.identity()) }
                                    else reply(port, id, JSONObject().put("canceled", true))
                                }
                            } catch (_: Exception) { choosingAccount = false; reply(port, id, error = "无法打开皮肤站登录，请重新进入社区。") }
                        }
                    } catch (_: Exception) { runOnUiThread { choosingAccount = false; reply(port, id, error = "无法读取本机角色，请重新打开应用。") } }
                }
            }
            "android.game.state" -> reply(port,id,games.status())
            "android.game.list", "android.game.versions" -> lifecycleScope.launch {
                try {reply(port,id,if(action=="android.game.list")games.library() else games.versions())}
                catch (_:Exception){reply(port,id,error=if(action=="android.game.list")"无法读取当前游戏目录。" else "暂时连不上游戏版本目录，请稍后重试。")}
            }
            "android.join","android.game.play","android.game.download","android.game.import","android.game.respond","android.game.cancel" -> {
                try {
                    when(action){
                        "android.game.respond" -> games.respond(args)
                        "android.game.cancel" -> games.cancel(args)
                        else -> games.begin(action,args)
                    }
                    reply(port,id,games.status())
                } catch(e:Exception){reply(port,id,error=e.message ?: "无法开始这个游戏操作。")}
            }
            "external.open" -> {
                val target = Uri.parse(args.optString("url"))
                if (target.scheme == "https") { openExternal(target); reply(port, id, true) }
                else reply(port, id, error = "请打开 HTTPS 链接。")
            }
            "android.identity" -> io.execute {
                try { TownSession.initialize(this); reply(port, id, TownSession.restore(this)) }
                catch (_: Exception) { reply(port, id, error = "暂时无法读取本机角色，请重试。") }
            }
            "android.world.save", "blueprints.instances", "blueprints.download", "blueprints.cancel", "asset.export" -> io.execute {
                try {
                    val session=cached ?: error("请先连接社区。")
                    check(session.getJSONObject("user").getString("uid")==TownSession.identity().optString("uid")) { "当前角色已切换。" }
                    when(action){
                        "android.world.save" -> selectDestination(Save(port,id,files.world(args,session.getString("token"))))
                        "blueprints.instances" -> reply(port,id,files.instances())
                        "blueprints.download" -> {
                            val (document,target)=files.blueprint(args,session.getString("token"))
                            if(target==null) selectDestination(Save(port,id,document))
                            else reply(port,id,JSONObject().put("ok",true).put("file",target.name))
                        }
                        "blueprints.cancel" -> reply(port,id,true)
                        else -> when(args.getString("action")){
                            "begin" -> reply(port,id,files.begin(args))
                            "chunk" -> { files.chunk(args);reply(port,id,true) }
                            "finish" -> selectDestination(Save(port,id,files.finish(args.getString("id"))))
                            "abort" -> { files.abort(args.getString("id"));reply(port,id,true) }
                            else -> reply(port,id,error="文件保存步骤无效。")
                        }
                    }
                }catch(e:Exception){reply(port,id,error=(if(e is IllegalStateException||e is IllegalArgumentException)e.message else null)?:"文件未保存，请检查连接和可用空间。")}
            }
            "community.connect" -> io.execute {
                try {
                    val previous = cached
                    val same = previous != null && previous.getJSONObject("user").optString("uid") == TownSession.identity().optString("uid")
                    if (args.optBoolean("refresh") || !same || System.currentTimeMillis() - cachedAt > 30 * 60 * 1000) {
                        cached = TownSession.connect()
                        cachedAt = System.currentTimeMillis()
                    }
                    reply(port, id, cached)
                } catch (e: Exception) {
                    cached = null
                    reply(port, id, error = if (e is IllegalStateException) e.message else "连接失败，请检查网络，再重新连接社区。")
                }
            }
            else -> reply(port, id, error = "此操作需要在游戏管理中打开。")
        }
    }

    private fun selectDestination(request: Save) = runOnUiThread {
        if(isFinishing||isDestroyed||save!=null){request.document.file.delete();reply(request.port,request.id,error="保存任务已结束。");return@runOnUiThread}
        save=request
        try {
            startActivityForResult(Intent(Intent.ACTION_CREATE_DOCUMENT).addCategory(Intent.CATEGORY_OPENABLE)
                .setType(request.document.mime).putExtra(Intent.EXTRA_TITLE,request.document.name),83)
        }catch(_:android.content.ActivityNotFoundException){save=null;request.document.file.delete();reply(request.port,request.id,error="此设备没有文件选择器。")}
    }
    private fun importUri(value: Intent?) = value?.takeIf { it.action==Intent.ACTION_VIEW }?.data?.takeIf { it.scheme=="content" }

    override fun onNewIntent(value: Intent) {
        super.onNewIntent(value)
        importUri(value)?.let { incomingPack=it; view.evaluateJavascript("location.hash='/town/games'",null) }
    }
    suspend fun takePack(): Uri? {
        incomingPack?.let { incomingPack=null; return it }
        check(packPicker==null) { "已经在选择整合包。" }
        val request=CompletableDeferred<Uri?>()
        packPicker=request
        try {
            startActivityForResult(Intent(Intent.ACTION_OPEN_DOCUMENT).addCategory(Intent.CATEGORY_OPENABLE).setType("*/*"),84)
            return request.await()
        } finally { if(packPicker===request)packPicker=null }
    }

    private fun openExternal(url: Uri) {
        try { startActivity(Intent(Intent.ACTION_VIEW, url)) }
        catch (_: android.content.ActivityNotFoundException) { Toast.makeText(this, "设备没有可用浏览器。", Toast.LENGTH_SHORT).show() }
    }
    private fun reply(port: Reply, id: Int, value: Any? = null, error: String? = null) {
        runOnUiThread {
            if (!isDestroyed && !isFinishing && document == port.document) {
                val json = JSONObject().put("id", id).put("ok", error == null)
                if (error != null) json.put("error", error) else json.put("value", value ?: JSONObject.NULL)
                port.post(json.toString())
            }
        }
    }
    override fun onRequestPermissionsResult(code: Int, permissions: Array<String>, result: IntArray) {
        super.onRequestPermissionsResult(code, permissions, result)
        if (code == 81) { if (result.firstOrNull() == PackageManager.PERMISSION_GRANTED) microphone?.grant(arrayOf(PermissionRequest.RESOURCE_AUDIO_CAPTURE)) else microphone?.deny(); microphone = null }
    }
    @Deprecated("Uses the platform document picker")
    override fun onActivityResult(requestCode: Int, resultCode: Int, data: Intent?) {
        super.onActivityResult(requestCode, resultCode, data)
        if(requestCode==84) { packPicker?.complete(data?.data?.takeIf { resultCode==RESULT_OK && it.scheme=="content" }); return }
        if(requestCode==83){
            val request=save?:return;save=null
            val target=data?.data
            io.execute {
                try{
                    if(resultCode!=RESULT_OK||target==null)reply(request.port,request.id,JSONObject().put("canceled",true))
                    else {
                        check(target.scheme=="content")
                        val output=contentResolver.openOutputStream(target,"wt")?:error("无法打开目标文档。")
                        output.use { out->request.document.file.inputStream().use { it.copyTo(out) } }
                        reply(request.port,request.id,JSONObject().put("ok",true).put("file",request.document.name))
                    }
                }catch(_:Exception){reply(request.port,request.id,error="保存失败，请重新选择文档。")}
                finally{request.document.file.delete()}
            }
            return
        }
        if (requestCode != 82) return
        val uris = if (resultCode == RESULT_OK) data?.clipData?.let { clip -> (0 until clip.itemCount).map { clip.getItemAt(it).uri }.toTypedArray() } ?: data?.data?.let { arrayOf(it) } else null
        picker?.onReceiveValue(uris); picker = null
    }
    override fun onResume() {
        super.onResume()
        if (::view.isInitialized) view.evaluateJavascript("window.dispatchEvent(new Event('town-resume'))", null)
    }
    override fun onSaveInstanceState(outState: Bundle) {
        super.onSaveInstanceState(outState)
        if (::view.isInitialized) view.url?.substringAfter('#', "")?.takeIf { it.startsWith('/') }?.let { outState.putString("town-route", "#" + it) }
    }
    @Deprecated("Uses WebView navigation history")
    override fun onBackPressed() { if (view.canGoBack()) view.goBack() else finish() }
    override fun onDestroy() {
        packPicker?.cancel()
        publicNetwork.shutdownNow()
        if (!::view.isInitialized) { io.shutdown(); super.onDestroy(); return }
        channel?.close(); channel = null; picker?.onReceiveValue(null); picker = null; microphone?.deny(); microphone = null
        save?.document?.file?.delete();save=null;io.execute { files.abort() };io.shutdown();view.stopLoading(); view.destroy()
        super.onDestroy()
    }
}
