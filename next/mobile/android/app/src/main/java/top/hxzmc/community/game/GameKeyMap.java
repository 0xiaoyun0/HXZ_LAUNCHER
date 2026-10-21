package top.hxzmc.community.game;

import android.view.KeyEvent;

/** Android physical key positions to GLFW key constants; text uses a separate channel. */
final class GameKeyMap {
    static int glfwKey(int key){
        if(key>=KeyEvent.KEYCODE_A&&key<=KeyEvent.KEYCODE_Z)return 65+key-KeyEvent.KEYCODE_A;
        if(key>=KeyEvent.KEYCODE_0&&key<=KeyEvent.KEYCODE_9)return 48+key-KeyEvent.KEYCODE_0;
        if(key>=KeyEvent.KEYCODE_F1&&key<=KeyEvent.KEYCODE_F12)return 290+key-KeyEvent.KEYCODE_F1;
        if(key>=KeyEvent.KEYCODE_NUMPAD_0&&key<=KeyEvent.KEYCODE_NUMPAD_9)return 320+key-KeyEvent.KEYCODE_NUMPAD_0;
        switch(key){
            case KeyEvent.KEYCODE_SPACE:return 32;
            case KeyEvent.KEYCODE_APOSTROPHE:return 39;
            case KeyEvent.KEYCODE_COMMA:return 44;
            case KeyEvent.KEYCODE_MINUS:return 45;
            case KeyEvent.KEYCODE_PERIOD:return 46;
            case KeyEvent.KEYCODE_SLASH:return 47;
            case KeyEvent.KEYCODE_EQUALS:return 61;
            case KeyEvent.KEYCODE_LEFT_BRACKET:return 91;
            case KeyEvent.KEYCODE_BACKSLASH:return 92;
            case KeyEvent.KEYCODE_RIGHT_BRACKET:return 93;
            case KeyEvent.KEYCODE_GRAVE:return 96;
            case KeyEvent.KEYCODE_SEMICOLON:return 59;
            case KeyEvent.KEYCODE_ESCAPE:case KeyEvent.KEYCODE_BACK:return 256;
            case KeyEvent.KEYCODE_ENTER:return 257;
            case KeyEvent.KEYCODE_TAB:return 258;
            case KeyEvent.KEYCODE_DEL:return 259;
            case KeyEvent.KEYCODE_INSERT:return 260;
            case KeyEvent.KEYCODE_FORWARD_DEL:return 261;
            case KeyEvent.KEYCODE_DPAD_RIGHT:return 262;
            case KeyEvent.KEYCODE_DPAD_LEFT:return 263;
            case KeyEvent.KEYCODE_DPAD_DOWN:return 264;
            case KeyEvent.KEYCODE_DPAD_UP:return 265;
            case KeyEvent.KEYCODE_PAGE_UP:return 266;
            case KeyEvent.KEYCODE_PAGE_DOWN:return 267;
            case KeyEvent.KEYCODE_MOVE_HOME:return 268;
            case KeyEvent.KEYCODE_MOVE_END:return 269;
            case KeyEvent.KEYCODE_CAPS_LOCK:return 280;
            case KeyEvent.KEYCODE_SCROLL_LOCK:return 281;
            case KeyEvent.KEYCODE_NUM_LOCK:return 282;
            case KeyEvent.KEYCODE_SYSRQ:return 283;
            case KeyEvent.KEYCODE_BREAK:return 284;
            case KeyEvent.KEYCODE_NUMPAD_DOT:return 330;
            case KeyEvent.KEYCODE_NUMPAD_DIVIDE:return 331;
            case KeyEvent.KEYCODE_NUMPAD_MULTIPLY:return 332;
            case KeyEvent.KEYCODE_NUMPAD_SUBTRACT:return 333;
            case KeyEvent.KEYCODE_NUMPAD_ADD:return 334;
            case KeyEvent.KEYCODE_NUMPAD_ENTER:return 335;
            case KeyEvent.KEYCODE_NUMPAD_EQUALS:return 336;
            case KeyEvent.KEYCODE_SHIFT_LEFT:return 340;
            case KeyEvent.KEYCODE_CTRL_LEFT:return 341;
            case KeyEvent.KEYCODE_ALT_LEFT:return 342;
            case KeyEvent.KEYCODE_META_LEFT:return 343;
            case KeyEvent.KEYCODE_SHIFT_RIGHT:return 344;
            case KeyEvent.KEYCODE_CTRL_RIGHT:return 345;
            case KeyEvent.KEYCODE_ALT_RIGHT:return 346;
            case KeyEvent.KEYCODE_META_RIGHT:return 347;
            case KeyEvent.KEYCODE_MENU:return 348;
            default:return -1;
        }
    }
    static boolean printable(int codepoint,boolean ctrl,boolean alt,boolean meta){
        return !ctrl&&!alt&&!meta&&Character.isValidCodePoint(codepoint)&&codepoint>0
                &&!Character.isISOControl(codepoint)&&!(codepoint>=0xd800&&codepoint<=0xdfff);
    }
    static int modifiers(int state){
        return ((state&KeyEvent.META_SHIFT_ON)!=0?1:0)|((state&KeyEvent.META_CTRL_ON)!=0?2:0)
                |((state&KeyEvent.META_ALT_ON)!=0?4:0)|((state&KeyEvent.META_META_ON)!=0?8:0)
                |((state&KeyEvent.META_CAPS_LOCK_ON)!=0?16:0)|((state&KeyEvent.META_NUM_LOCK_ON)!=0?32:0);
    }
}
