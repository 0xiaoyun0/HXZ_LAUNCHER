package top.hxzmc.town

import android.Manifest
import android.app.Activity
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

class TownCommunityActivity : Activity() {
    private val origin = "https://appassets.androidplatform.net"
    private lateinit var view: WebView
    private var channel: WebMessagePort? = null
    private var document = 0L
    private data class Reply(val document: Long, val post: (String) -> Unit)
    private var microphone: PermissionRequest? = null
    private var picker: ValueCallback<Array<Uri>>? = null
    private val io = Executors.newSingleThreadExecutor()
    private var cached: JSONObject? = null
    private var cachedAt = 0L
    private val files by lazy { TownFiles(cacheDir) }
    private data class Save(val port: Reply, val id: Int, val document: TownFiles.Document)
    private var save: Save? = null

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        val loader = WebViewAssetLoader.Builder().addPathHandler("/") { asset ->
            val missing = { WebResourceResponse("text/plain", "UTF-8", 404, "Missing", emptyMap(), ByteArrayInputStream(byteArrayOf())) }
            if (asset.split('/').any { it.isEmpty() || it == "." || it == ".." || it.contains('\\') }) missing()
            else try {
                val mime = when (asset.substringAfterLast('.')) {
                    "js","mjs" -> "application/javascript"
                    "css" -> "text/css"
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
        view.loadUrl(origin + "/index.html#/community")
    }

    private fun dispatch(port: Reply, raw: String) {
        val input = runCatching { JSONObject(raw) }.getOrNull() ?: return
        val id = input.optInt("id")
        val args = input.optJSONObject("input") ?: JSONObject()
        when (val action = input.optString("action")) {
            "android.leave" -> finish()
            "external.open" -> {
                val target = Uri.parse(args.optString("url"))
                if (target.scheme == "https") { openExternal(target); reply(port, id, true) }
                else reply(port, id, error = "请打开 HTTPS 链接。")
            }
            "android.identity" -> reply(port, id, TownSession.identity())
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
            else -> reply(port, id, error = "此操作需要从游戏首页的实例管理打开。")
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
    @Deprecated("Uses WebView navigation history")
    override fun onBackPressed() { if (view.canGoBack()) view.goBack() else finish() }
    override fun onDestroy() {
        channel?.close(); channel = null; picker?.onReceiveValue(null); picker = null; microphone?.deny(); microphone = null
        save?.document?.file?.delete();save=null;io.execute { files.abort() };io.shutdown();view.stopLoading(); view.destroy()
        super.onDestroy()
    }
}
