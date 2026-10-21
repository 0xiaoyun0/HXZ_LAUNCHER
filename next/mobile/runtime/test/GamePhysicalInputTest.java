package top.hxzmc.community.game;

import android.view.KeyEvent;
import java.util.*;

public final class GamePhysicalInputTest {
    private static int checks;
    private static void check(boolean condition,String message){checks++;if(!condition)throw new AssertionError(message);}
    public static void main(String[] args){
        for(int key=KeyEvent.KEYCODE_A;key<=KeyEvent.KEYCODE_Z;key++)check(GameKeyMap.glfwKey(key)==65+key-KeyEvent.KEYCODE_A,"Alphabet key");
        for(int key=KeyEvent.KEYCODE_F1;key<=KeyEvent.KEYCODE_F12;key++)check(GameKeyMap.glfwKey(key)==290+key-KeyEvent.KEYCODE_F1,"Function key");
        for(int key=KeyEvent.KEYCODE_NUMPAD_0;key<=KeyEvent.KEYCODE_NUMPAD_9;key++)check(GameKeyMap.glfwKey(key)==320+key-KeyEvent.KEYCODE_NUMPAD_0,"Keypad key");
        int[][] pairs={{KeyEvent.KEYCODE_SLASH,47},{KeyEvent.KEYCODE_SEMICOLON,59},{KeyEvent.KEYCODE_GRAVE,96},{KeyEvent.KEYCODE_INSERT,260},{KeyEvent.KEYCODE_MOVE_HOME,268},{KeyEvent.KEYCODE_MOVE_END,269},{KeyEvent.KEYCODE_PAGE_UP,266},{KeyEvent.KEYCODE_PAGE_DOWN,267},{KeyEvent.KEYCODE_NUMPAD_ENTER,335},{KeyEvent.KEYCODE_META_LEFT,343},{KeyEvent.KEYCODE_META_RIGHT,347},{KeyEvent.KEYCODE_CTRL_RIGHT,345}};
        for(int[] pair:pairs)check(GameKeyMap.glfwKey(pair[0])==pair[1],"Missing punctuation/navigation/modifier key "+pair[0]);
        check(GameKeyMap.glfwKey(KeyEvent.KEYCODE_VOLUME_UP)==-1,"System volume must remain system owned");
        check(GameKeyMap.glfwKey(KeyEvent.KEYCODE_BUTTON_A)==-1,"Gamepad face buttons must not be misreported as keyboard");
        check(GameKeyMap.printable(0x1f600,false,false,false),"Supplementary Unicode must survive");
        for(int code:new int[]{0,10,13,0x7f,0xd800,0x110000,Integer.MIN_VALUE})check(!GameKeyMap.printable(code,false,false,false),"Invalid/control/dead key leaked "+code);
        check(!GameKeyMap.printable('a',true,false,false),"Ctrl+A must not type a");
        check(!GameKeyMap.printable('a',false,true,false),"Alt shortcut must not type a");
        check(!GameKeyMap.printable('a',false,false,true),"Meta shortcut must not type a");
        int modifiers=KeyEvent.META_SHIFT_ON|KeyEvent.META_CTRL_ON|KeyEvent.META_ALT_ON|KeyEvent.META_META_ON|KeyEvent.META_CAPS_LOCK_ON|KeyEvent.META_NUM_LOCK_ON;
        check(GameKeyMap.modifiers(modifiers)==63,"GLFW modifiers including lock states");
        List<String> events=new ArrayList<>();GameMouseState.Output output=(button,down)->events.add(button+":"+down);
        GameMouseState mouse=new GameMouseState();
        mouse.edge(1,true,output);mouse.snapshot(2,output);mouse.snapshot(2,output);mouse.edge(1,false,output);mouse.snapshot(0,output);
        check(events.equals(Arrays.asList("1:true","1:false")),"KeyEvent/MotionEvent duplicate right button edges");
        events.clear();mouse.edge(1,true,output);mouse.snapshot(0,output);
        check(events.equals(Arrays.asList("1:true")),"An empty raw snapshot must not release an emulated held right button");
        mouse.snapshot(2,output);mouse.edge(1,false,output);
        check(events.equals(Arrays.asList("1:true")),"One source releasing must preserve the other held source");
        mouse.snapshot(0,output);check(events.equals(Arrays.asList("1:true","1:false")),"Both mouse channels releasing must balance the button");
        events.clear();mouse.snapshot(7,output);mouse.snapshot(5,output);mouse.release(output);mouse.release(output);
        check(events.equals(Arrays.asList("0:true","1:true","2:true","1:false","0:false","2:false")),"Chords/focus release must balance all buttons exactly once");
        events.clear();mouse.snapshot(24,output);mouse.release(output);
        check(events.equals(Arrays.asList("3:true","4:true","3:false","4:false")),"Back/forward mouse buttons");
        check(GameMouseState.coordinate(960,1920,1280)==640000,"Absolute coordinate must follow render scale");
        check(GameMouseState.coordinate(-1,1920,1280)==0,"Negative coordinate clamp");
        check(GameMouseState.coordinate(2000,1920,1280)==1280000,"Right edge coordinate clamp");
        check(GameMouseState.coordinate(Float.NaN,1920,1280)==0,"Invalid pointer coordinate");
        check(GameMouseState.coordinate(100,0,1280)==0,"Unavailable viewport");
        System.out.println("PASS "+checks+" physical keyboard/mouse assertions; pure state replay, no device interaction");
    }
}
