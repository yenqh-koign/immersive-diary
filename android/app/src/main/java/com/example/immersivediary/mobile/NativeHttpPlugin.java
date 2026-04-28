package com.example.immersivediary.mobile;

import android.util.Base64;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

import org.json.JSONObject;

import java.util.Iterator;
import java.util.concurrent.TimeUnit;

import okhttp3.MediaType;
import okhttp3.OkHttpClient;
import okhttp3.Request;
import okhttp3.RequestBody;
import okhttp3.Response;
import okhttp3.ResponseBody;

@CapacitorPlugin(name = "NativeHttp")
public class NativeHttpPlugin extends Plugin {

    private OkHttpClient client;

    @Override
    public void load() {
        client = new OkHttpClient.Builder()
            .connectTimeout(15, TimeUnit.SECONDS)
            .readTimeout(30, TimeUnit.SECONDS)
            .followRedirects(true)
            .build();
    }

    @PluginMethod
    public void request(PluginCall call) {
        String urlStr = call.getString("url");
        String method = call.getString("method", "GET");
        String body = call.getString("body", null);
        String responseType = call.getString("responseType", "text");
        String headersJson = call.getString("headersJson", "{}");

        new Thread(() -> {
            try {
                Request.Builder requestBuilder = new Request.Builder().url(urlStr);

                JSONObject headers = new JSONObject(headersJson);
                Iterator<String> keys = headers.keys();
                while (keys.hasNext()) {
                    String key = keys.next();
                    String value = headers.optString(key, "");
                    if (!value.isEmpty()) {
                        requestBuilder.addHeader(key, value);
                    }
                }

                RequestBody requestBody = null;
                if (body != null && !body.isEmpty()) {
                    String contentType = headers.optString("Content-Type", "text/plain; charset=utf-8");
                    requestBody = RequestBody.create(body.getBytes("UTF-8"),
                        MediaType.parse(contentType));
                }

                String upperMethod = method.toUpperCase();
                if ("GET".equals(upperMethod)) {
                    requestBuilder.get();
                } else if ("HEAD".equals(upperMethod)) {
                    requestBuilder.head();
                } else {
                    if (requestBody == null) {
                        requestBody = RequestBody.create(new byte[0], null);
                    }
                    requestBuilder.method(upperMethod, requestBody);
                }

                Response response = client.newCall(requestBuilder.build()).execute();

                int status = response.code();
                String data = "";

                ResponseBody responseBody = response.body();
                if (responseBody != null) {
                    if ("arraybuffer".equals(responseType)) {
                        byte[] bytes = responseBody.bytes();
                        data = Base64.encodeToString(bytes, Base64.NO_WRAP);
                    } else {
                        data = responseBody.string();
                    }
                }

                JSObject result = new JSObject();
                result.put("status", status);
                result.put("data", data);
                call.resolve(result);
            } catch (Exception e) {
                call.reject("HTTP request failed: " + e.getMessage());
            }
        }).start();
    }
}
