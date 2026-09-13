package com.vignesh.orefinder;
import android.app.Activity;
import android.os.Bundle;
import android.content.*;
import android.net.Uri;
import android.webkit.*;
import android.widget.TextView;
import java.io.*;
import java.net.*;
import java.nio.charset.StandardCharsets;
import java.util.*;
import java.util.concurrent.*;
public class MainActivity extends Activity {
 private PermissionRequest cameraRequest; private WebView web; private ServerSocket server; private volatile boolean closed;
 private final ExecutorService requests=Executors.newFixedThreadPool(4);
 private String root, prefix, pendingCsv; private volatile String incoming=""; private ValueCallback<Uri[]> imagePicker;
 @Override public void onCreate(Bundle state){super.onCreate(state);incoming=expeditionLink(getIntent());try{
  prefix="/"+UUID.randomUUID().toString()+"/";
  server=new ServerSocket(0,16,InetAddress.getByName("127.0.0.1"));
  root="http://127.0.0.1:"+server.getLocalPort()+prefix;
  Thread listener=new Thread(()->{while(!closed){try{final Socket socket=server.accept();requests.submit(()->serve(socket));}catch(Exception e){if(closed)break;}}},"Atlas assets");listener.setDaemon(true);listener.start();
  web=new WebView(this);web.setBackgroundColor(0xff0b121c);WebSettings s=web.getSettings();s.setJavaScriptEnabled(true);s.setDomStorageEnabled(true);s.setAllowFileAccess(false);s.setAllowContentAccess(false);s.setMixedContentMode(WebSettings.MIXED_CONTENT_NEVER_ALLOW);s.setJavaScriptCanOpenWindowsAutomatically(false);
  web.setWebChromeClient(new WebChromeClient(){
 @Override public void onPermissionRequest(PermissionRequest request){runOnUiThread(()->{
  Uri origin=request.getOrigin(),local=Uri.parse(root);String[] resources=request.getResources();
  if(closed||!"http".equals(origin.getScheme())||!"127.0.0.1".equals(origin.getHost())||origin.getPort()!=local.getPort()||web.getUrl()==null||!web.getUrl().startsWith(root)||resources.length!=1||!PermissionRequest.RESOURCE_VIDEO_CAPTURE.equals(resources[0])){request.deny();return;}
  if(checkSelfPermission(android.Manifest.permission.CAMERA)==android.content.pm.PackageManager.PERMISSION_GRANTED){request.grant(new String[]{PermissionRequest.RESOURCE_VIDEO_CAPTURE});return;}
  if(cameraRequest!=null){request.deny();return;}cameraRequest=request;requestPermissions(new String[]{android.Manifest.permission.CAMERA},60);
 });}
 @Override public void onPermissionRequestCanceled(PermissionRequest request){runOnUiThread(()->{if(cameraRequest==request)cameraRequest=null;});}
 @Override public boolean onShowFileChooser(WebView v,ValueCallback<Uri[]> callback,FileChooserParams params){if(imagePicker!=null)imagePicker.onReceiveValue(null);imagePicker=callback;Intent pick=new Intent(Intent.ACTION_GET_CONTENT);pick.addCategory(Intent.CATEGORY_OPENABLE);pick.setType("image/*");try{startActivityForResult(Intent.createChooser(pick,"Choose QR screenshot"),41);return true;}catch(ActivityNotFoundException e){imagePicker=null;return false;}}});
  web.addJavascriptInterface(new Bridge(),"AtlasNative");web.setWebViewClient(new WebViewClient(){
   @Override public boolean shouldOverrideUrlLoading(WebView v,WebResourceRequest r){return !r.getUrl().toString().startsWith(root);}
   @Override public WebResourceResponse shouldInterceptRequest(WebView v,WebResourceRequest r){if(r.getUrl().toString().startsWith(root)||"https".equals(r.getUrl().getScheme()))return null;return new WebResourceResponse("text/plain","UTF-8",new ByteArrayInputStream(new byte[0]));}
  });setContentView(web);web.loadUrl(root);
 }catch(Exception e){TextView t=new TextView(this);t.setText("Ore Atlas could not start. Close the app and try again.");t.setPadding(32,64,32,32);setContentView(t);}}
 @Override public void onRequestPermissionsResult(int code,String[] permissions,int[] grants){super.onRequestPermissionsResult(code,permissions,grants);if(code==60&&cameraRequest!=null){PermissionRequest request=cameraRequest;cameraRequest=null;if(!closed&&grants.length>0&&grants[0]==android.content.pm.PackageManager.PERMISSION_GRANTED)request.grant(new String[]{PermissionRequest.RESOURCE_VIDEO_CAPTURE});else request.deny();}}
 private void serve(Socket socket){try(Socket sock=socket){sock.setSoTimeout(5000);BufferedReader reader=new BufferedReader(new InputStreamReader(sock.getInputStream(),StandardCharsets.US_ASCII));String line=reader.readLine();if(line==null||line.length()>4096)return;String[] req=line.split(" ");if(req.length<2)return;String path=req[1].split("\\?",2)[0];int total=0;while((line=reader.readLine())!=null&&!line.isEmpty()){total+=line.length();if(total>16384)return;}
  if(!"GET".equals(req[0])||!path.startsWith(prefix)){respond(sock,403,"text/plain",new byte[0]);return;}String name=path.substring(prefix.length());if(name.isEmpty())name="index.html";
  if(!name.matches("[A-Za-z0-9_./-]+")||name.contains("..")){respond(sock,403,"text/plain",new byte[0]);return;}
  try(InputStream in=getAssets().open(name);ByteArrayOutputStream bytes=new ByteArrayOutputStream()){byte[] buf=new byte[16384];int n;while((n=in.read(buf))!=-1)bytes.write(buf,0,n);String mime=name.endsWith(".wasm")?"application/wasm":name.endsWith(".js")?"text/javascript":name.endsWith(".css")?"text/css":name.endsWith(".png")?"image/png":name.endsWith(".svg")?"image/svg+xml":name.endsWith(".json")?"application/json":name.endsWith(".html")?"text/html":"text/plain";respond(sock,200,mime,bytes.toByteArray());}catch(IOException e){respond(sock,404,"text/plain",new byte[0]);}
 }catch(IOException ignored){}}
 private void respond(Socket sock,int code,String mime,byte[] body)throws IOException{OutputStream out=sock.getOutputStream();String headers="HTTP/1.1 "+code+" "+(code==200?"OK":"Error")+"\r\nContent-Type: "+mime+"\r\nContent-Length: "+body.length+"\r\nConnection: close\r\nX-Content-Type-Options: nosniff\r\nContent-Security-Policy: default-src 'self'; script-src 'self' 'wasm-unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; media-src 'self' blob:; worker-src 'self'; connect-src 'self' https:; object-src 'none'; frame-src 'none'; base-uri 'self'\r\n\r\n";out.write(headers.getBytes(StandardCharsets.US_ASCII));out.write(body);out.flush();}
 private String expeditionLink(Intent i){if(i==null||i.getData()==null)return "";Uri u=i.getData();String s=u.toString();return "oreatlas".equals(u.getScheme())&&("expedition".equals(u.getHost())||"room".equals(u.getHost()))&&s.length()<=4096?s:"";}
 @Override protected void onNewIntent(Intent i){super.onNewIntent(i);setIntent(i);incoming=expeditionLink(i);if(web!=null&&!incoming.isEmpty()){String link=incoming;web.evaluateJavascript("window.dispatchEvent(new CustomEvent('atlas-expedition',{detail:"+org.json.JSONObject.quote(link)+"}))",null);}}
 private final class Bridge{
  @JavascriptInterface public synchronized String takeExpedition(){String s=incoming;incoming="";return s;}
  @JavascriptInterface public void shareText(String text){if(text.length()>4096||!(text.startsWith("oreatlas://expedition?")||text.startsWith("oreatlas://room?")))return;runOnUiThread(()->{Intent i=new Intent(Intent.ACTION_SEND);i.setType("text/plain");i.putExtra(Intent.EXTRA_TEXT,text);startActivity(Intent.createChooser(i,"Share expedition"));});}

  @JavascriptInterface public String getStore(String k){return k.startsWith("atlas-")?getSharedPreferences("atlas-v4",0).getString(k,"null"):"null";}
  @JavascriptInterface public void setStore(String k,String v){if(k.startsWith("atlas-")&&k.length()<100&&v.length()<1000000)getSharedPreferences("atlas-v4",0).edit().putString(k,v).apply();}
  @JavascriptInterface public void copy(String text){if(text.length()>4096)return;runOnUiThread(()->((ClipboardManager)getSystemService(CLIPBOARD_SERVICE)).setPrimaryClip(ClipData.newPlainText("Ore coordinates",text)));}
  @JavascriptInterface public void saveCsv(String csv){if(csv.length()>2000000)return;runOnUiThread(()->{if(pendingCsv!=null)return;pendingCsv=csv;Intent i=new Intent(Intent.ACTION_CREATE_DOCUMENT);i.addCategory(Intent.CATEGORY_OPENABLE);i.setType("text/csv");i.putExtra(Intent.EXTRA_TITLE,"ore-atlas-candidates.csv");try{startActivityForResult(i,40);}catch(ActivityNotFoundException e){pendingCsv=null;}});}
 }
 @Override protected void onActivityResult(int request,int result,Intent data){super.onActivityResult(request,result,data);if(request==41&&imagePicker!=null){imagePicker.onReceiveValue(result==RESULT_OK&&data!=null&&data.getData()!=null?new Uri[]{data.getData()}:null);imagePicker=null;}if(request==40){String csv=pendingCsv;pendingCsv=null;if(result==RESULT_OK&&data!=null&&data.getData()!=null&&csv!=null){try(OutputStream out=getContentResolver().openOutputStream(data.getData())){if(out!=null)out.write(csv.getBytes(StandardCharsets.UTF_8));}catch(IOException e){android.widget.Toast.makeText(this,"Could not save CSV",android.widget.Toast.LENGTH_LONG).show();}}}}
 @Override public void onBackPressed(){if(web==null){finish();return;}web.evaluateJavascript("(()=>{const d=document.querySelector('dialog[open]');if(d){d.close();return true}return false})()",r->{if(!"true".equals(r))finish();});}
 @Override protected void onDestroy(){closed=true;if(cameraRequest!=null){cameraRequest.deny();cameraRequest=null;}if(imagePicker!=null){imagePicker.onReceiveValue(null);imagePicker=null;}try{if(server!=null)server.close();}catch(IOException ignored){}requests.shutdownNow();if(web!=null){web.removeJavascriptInterface("AtlasNative");web.stopLoading();web.destroy();}super.onDestroy();}
}
