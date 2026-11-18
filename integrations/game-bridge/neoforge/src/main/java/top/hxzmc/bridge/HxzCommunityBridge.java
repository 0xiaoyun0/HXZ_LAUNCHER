package top.hxzmc.bridge;

import com.google.gson.*;
import com.mojang.authlib.GameProfile;
import net.minecraft.SharedConstants;
import net.minecraft.core.registries.BuiltInRegistries;
import net.minecraft.network.chat.Component;
import net.minecraft.resources.ResourceLocation;
import net.minecraft.server.MinecraftServer;
import net.minecraft.server.level.ServerPlayer;
import net.minecraft.server.players.UserWhiteListEntry;
import net.minecraft.stats.Stats;
import net.minecraft.world.item.crafting.RecipeHolder;
import net.neoforged.api.distmarker.Dist;
import net.neoforged.bus.api.EventPriority;
import net.neoforged.fml.common.Mod;
import net.neoforged.fml.loading.FMLPaths;
import net.neoforged.neoforge.common.NeoForge;
import net.neoforged.neoforge.event.ServerChatEvent;
import net.neoforged.neoforge.event.server.ServerStartedEvent;
import net.neoforged.neoforge.event.server.ServerStoppingEvent;
import net.neoforged.neoforge.event.tick.ServerTickEvent;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import java.nio.file.*;
import java.util.*;

@Mod(value="hxz_community_bridge",dist=Dist.DEDICATED_SERVER)
public final class HxzCommunityBridge {
    private static final Logger LOG=LoggerFactory.getLogger("HXZ-Bridge");
    private BridgeTransport transport;
    private long ticks;
    private final LinkedHashSet<String> completed=new LinkedHashSet<>();
    private Path receiptFile;
    private Iterator<RecipeHolder<?>> recipes=Collections.emptyIterator();
    private JsonObject pendingRecipes;
    private static final List<ResourceLocation> METRICS=List.of(Stats.PLAY_TIME,Stats.WALK_ONE_CM,Stats.SPRINT_ONE_CM,Stats.JUMP,Stats.DEATHS,Stats.MOB_KILLS,Stats.PLAYER_KILLS,Stats.DAMAGE_DEALT,Stats.FISH_CAUGHT,Stats.ANIMALS_BRED);
    public HxzCommunityBridge(){
        NeoForge.EVENT_BUS.addListener(this::started);NeoForge.EVENT_BUS.addListener(this::stopping);NeoForge.EVENT_BUS.addListener(this::tick);
        NeoForge.EVENT_BUS.addListener(EventPriority.LOWEST,false,ServerChatEvent.class,this::chat);
    }
    private void started(ServerStartedEvent event){
        try{
            var config=BridgeTransport.load(FMLPaths.CONFIGDIR.get().resolve("hxz-community-bridge.properties"));
            if(!Boolean.parseBoolean(config.getProperty("enabled","false"))){LOG.info("游戏桥未启用；配置文件已准备好。");return;}
            transport=new BridgeTransport(config,LOG::warn);receiptFile=FMLPaths.CONFIGDIR.get().resolve("hxz-community-bridge-receipts.txt");
            if(Files.exists(receiptFile)&&Files.size(receiptFile)<1024*1024)completed.addAll(Files.readAllLines(receiptFile));
            recipes=event.getServer().getRecipeManager().getRecipes().iterator();
            snapshot(event.getServer());transport.start();LOG.info("幻想镇社区游戏桥已启用；客户端无需安装。");
        }catch(Exception error){LOG.error("无法启用游戏桥，请检查配置（{}）；不影响游戏运行。",error.getClass().getSimpleName());transport=null;}
    }
    private void stopping(ServerStoppingEvent event){if(transport!=null){transport.close();transport=null;}}
    private void tick(ServerTickEvent.Post event){
        if(transport==null)return;MinecraftServer server=event.getServer();ticks++;
        if(ticks%100==0)snapshot(server);
        if(ticks%600==0)statistics(server);
        if(ticks%20==0&&(pendingRecipes!=null||recipes.hasNext()))recipeBatch(server);
        for(int i=0;i<4;i++){var action=transport.nextAction();if(action==null)break;apply(server,action);}
    }
    private void snapshot(MinecraftServer server){
        JsonObject status=new JsonObject();status.addProperty("version",SharedConstants.getCurrentVersion().getName());status.addProperty("loader","neoforge");
        status.addProperty("online",server.getPlayerCount());status.addProperty("max",server.getMaxPlayers());JsonArray players=new JsonArray();
        server.getPlayerList().getPlayers().stream().limit(1000).forEach(p->{JsonObject value=new JsonObject();value.addProperty("uid",p.getUUID().toString());value.addProperty("name",p.getGameProfile().getName());players.add(value);});status.add("players",players);
        JsonArray caps=new JsonArray();for(String cap:List.of("status","statistics","chat","whitelist","recipes"))caps.add(cap);status.add("capabilities",caps);transport.snapshot(status);
    }
    private void statistics(MinecraftServer server){
        JsonArray players=new JsonArray();for(ServerPlayer p:server.getPlayerList().getPlayers()){
            JsonObject player=new JsonObject(),stats=new JsonObject();player.addProperty("uid",p.getUUID().toString());
            for(ResourceLocation metric:METRICS)stats.addProperty("minecraft:custom/"+metric,p.getStats().getValue(Stats.CUSTOM.get(metric)));
            player.add("stats",stats);players.add(player);if(players.size()==100){submitStats(players);players=new JsonArray();}
        }if(!players.isEmpty())submitStats(players);
    }
    private void submitStats(JsonArray players){JsonObject report=new JsonObject();report.addProperty("id",UUID.randomUUID().toString());report.addProperty("observed",System.currentTimeMillis());report.add("players",players);transport.submit("/api/game-stats/report",report);}
    private void recipeBatch(MinecraftServer server){
        if(pendingRecipes!=null){if(transport.submit("/api/game-bridge/recipes",pendingRecipes))pendingRecipes=null;return;}
        JsonArray items=new JsonArray();int visited=0;
        while(recipes.hasNext()&&visited++<25){
            var holder=recipes.next();try{
                var recipe=holder.value();var output=recipe.getResultItem(server.registryAccess());if(output.isEmpty()||recipe.getIngredients().isEmpty())continue;
                JsonObject entry=new JsonObject();entry.addProperty("id",holder.id().toString());entry.addProperty("type",BuiltInRegistries.RECIPE_TYPE.getKey(recipe.getType()).toString());entry.addProperty("output",BuiltInRegistries.ITEM.getKey(output.getItem()).toString());entry.addProperty("quantity",output.getCount());entry.addProperty("approximate",true);
                JsonArray ingredients=new JsonArray();for(var ingredient:recipe.getIngredients()){
                    if(ingredient.isEmpty())continue;JsonObject value=new JsonObject();value.addProperty("quantity",1);JsonArray options=new JsonArray();
                    Arrays.stream(ingredient.getItems()).limit(128).forEach(stack->options.add(BuiltInRegistries.ITEM.getKey(stack.getItem()).toString()));value.add("options",options);ingredients.add(value);
                }entry.add("ingredients",ingredients);items.add(entry);
            }catch(RuntimeException ignored){/* Custom recipes may need their own adapter; never break a tick. */}
        }
        if(!items.isEmpty()){JsonObject body=new JsonObject();body.add("items",items);if(!transport.submit("/api/game-bridge/recipes",body))pendingRecipes=body;}
    }
    private void chat(ServerChatEvent event){
        if(transport==null||!transport.chatEnabled()||event.isCanceled())return;
        String text=event.getRawText();if(text.startsWith("/")||text.startsWith("!!")||text.isBlank())return;
        JsonObject body=new JsonObject();body.addProperty("id",UUID.randomUUID().toString());body.addProperty("uid",event.getPlayer().getUUID().toString());body.addProperty("name",event.getUsername());body.addProperty("body",text.substring(0,Math.min(500,text.length())));transport.submit("/api/game-bridge/chat",body);
    }
    private void apply(MinecraftServer server,BridgeTransport.Action action){
        if(action.expires()<System.currentTimeMillis()){transport.acknowledge(action,false,"操作已过期");return;}
        if(completed.contains(action.id())){transport.acknowledge(action,true,"");return;}
        try{
            JsonObject value=action.value();String name=value.get("name").getAsString();if(!name.matches("\\w{1,16}"))throw new IllegalArgumentException("name");
            UUID uuid=UUID.fromString(value.get("uid").getAsString().replaceFirst("^(\\w{8})(\\w{4})(\\w{4})(\\w{4})(\\w{12})$","$1-$2-$3-$4-$5"));
            if(action.kind().equals("whitelist")){
                if(!transport.whitelistEnabled())throw new IllegalStateException("Whitelist sync disabled");
                server.getPlayerList().getWhiteList().add(new UserWhiteListEntry(new GameProfile(uuid,name)));
            }else if(action.kind().equals("chat")){
                if(!transport.chatEnabled())throw new IllegalStateException("Chat sync disabled");
                String message=value.get("body").getAsString();if(message.length()>500)throw new IllegalArgumentException("message");
                remember(action.id()); // Persist before delivery: a lost acknowledgement must not duplicate chat.
                server.getPlayerList().broadcastSystemMessage(Component.literal("[社区] "+name+"："+message),false);
            }else throw new IllegalArgumentException("Unsupported action");
            if(!completed.contains(action.id()))remember(action.id());transport.acknowledge(action,true,"");
        }catch(Exception error){transport.acknowledge(action,false,"游戏服处理失败："+error.getClass().getSimpleName());LOG.warn("游戏桥操作未完成：{}",error.getClass().getSimpleName());}
    }
    private void remember(String id) throws java.io.IOException{
        completed.add(id);while(completed.size()>4096)completed.remove(completed.iterator().next());
        Path temp=receiptFile.resolveSibling(receiptFile.getFileName()+".tmp");Files.write(temp,completed);
        try{Files.move(temp,receiptFile,StandardCopyOption.REPLACE_EXISTING,StandardCopyOption.ATOMIC_MOVE);}catch(AtomicMoveNotSupportedException e){Files.move(temp,receiptFile,StandardCopyOption.REPLACE_EXISTING);}
    }
}
