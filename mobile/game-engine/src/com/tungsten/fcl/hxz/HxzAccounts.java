package com.tungsten.fcl.hxz;

import com.tungsten.fcl.setting.Accounts;
import com.tungsten.fclcore.auth.Account;
import com.tungsten.fclcore.auth.authlibinjector.AuthlibInjectorAccount;
import org.json.JSONObject;
import java.io.IOException;
import java.util.*;

/** Import into FCL's normal account store; never serialize credentials into instance files. */
final class HxzAccounts {
    static final String SKIN="https://skin.hxzmc.top/api/yggdrasil/";
    static Account install(JSONObject selected)throws Exception{
        String uuid=selected.getString("uuid").replace("-",""),name=selected.getString("name");
        if(!uuid.matches("[0-9a-fA-F]{32}")||name.trim().isEmpty()||selected.optString("accessToken").isEmpty()||selected.optString("clientToken").isEmpty())
            throw new IOException("社区皮肤站账号不完整，请返回社区重新登录并选择角色");
        Map<Object,Object> storage=new HashMap<>();storage.put("serverBaseURL",SKIN);
        storage.put("username",selected.optString("username",name));storage.put("displayName",name);
        storage.put("uuid",uuid);storage.put("accessToken",selected.getString("accessToken"));storage.put("clientToken",selected.getString("clientToken"));
        Account account=Accounts.FACTORY_AUTHLIB_INJECTOR.fromStorage(storage);
        for(Account old:new ArrayList<>(Accounts.getAccounts()))if(old instanceof AuthlibInjectorAccount&&old.getUUID().equals(account.getUUID())
                &&SKIN.equals(((AuthlibInjectorAccount)old).getServer().getUrl().replaceAll("/+$","")+"/"))Accounts.getAccounts().remove(old);
        Accounts.addAccount(account);Accounts.setSelectedAccount(account);return account;
    }
    static JSONObject export(Account account)throws Exception{
        if(!(account instanceof AuthlibInjectorAccount)||!SKIN.equals(((AuthlibInjectorAccount)account).getServer().getUrl().replaceAll("/+$","")+"/"))
            throw new IOException("请从幻想镇社区登录皮肤站后启动此服务器");
        Map<Object,Object> saved=account.toStorage();
        JSONObject result=new JSONObject();result.put("name",saved.get("displayName"));result.put("username",saved.get("username"));result.put("uuid",saved.get("uuid"));result.put("accessToken",saved.get("accessToken"));result.put("clientToken",saved.get("clientToken"));return result;
    }
}
