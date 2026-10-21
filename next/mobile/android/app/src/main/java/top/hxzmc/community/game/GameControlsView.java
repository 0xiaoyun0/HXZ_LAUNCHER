package top.hxzmc.community.game;

import android.content.Context;
import android.graphics.*;
import android.view.*;
import java.util.*;

/** One device controls one player. Touch controls and physical input share GLFW events. */
final class GameControlsView extends View {
    private static final class Control {
        final RectF rect;final String label;final int key,button;
        Control(RectF rect,String label,int key,int button){this.rect=rect;this.label=label;this.key=key;this.button=button;}
    }
    private final Paint paint=new Paint(Paint.ANTI_ALIAS_FLAG);
    private final List<Control> controls=new ArrayList<>();
    private final Map<Integer,Control> pressed=new HashMap<>();
    private final Map<Integer,PointF> looking=new HashMap<>();
    private final Set<Integer> dragged=new HashSet<>();
    private float unit,desiredUnit,sensitivity=1;private int renderWidth=1280,renderHeight=720;private Runnable exitAction,keyboardAction;private Control exitControl,keyboardControl;
    GameControlsView(Context context){super(context);setFocusableInTouchMode(true);setContentDescription("游戏触控：左侧移动，右侧视角，右下角跳跃与操作");}
    void setExitAction(Runnable action){exitAction=action;}
    void setKeyboardAction(Runnable action){keyboardAction=action;}
    void configure(float size,float sensitivity,int w,int h){desiredUnit=getResources().getDisplayMetrics().density*48*Math.max(.7f,Math.min(1.5f,size));this.sensitivity=Math.max(.25f,Math.min(3,sensitivity));renderWidth=w;renderHeight=h;layoutControls();invalidate();}
    private void layoutControls(){
        if(desiredUnit==0)desiredUnit=48*getResources().getDisplayMetrics().density;controls.clear();exitControl=null;keyboardControl=null;
        if(getWidth()<1||getHeight()<1)return;GameTouchLayout layout=new GameTouchLayout(getWidth(),getHeight(),desiredUnit);unit=layout.unit;
        for(GameTouchLayout.Item item:layout.items){Control c=new Control(new RectF(item.x,item.y,item.x+item.width,item.y+item.height),item.label,item.key,item.button);controls.add(c);if(item.key==GameTouchLayout.EXIT)exitControl=c;if(item.key==GameTouchLayout.KEYBOARD)keyboardControl=c;}
    }
    @Override protected void onSizeChanged(int w,int h,int oldw,int oldh){release();layoutControls();}
    @Override protected void onDraw(Canvas canvas){
        for(Control c:controls){boolean down=pressed.containsValue(c);paint.setColor(down?0x995b68cb:0x66313a55);canvas.drawRoundRect(c.rect,unit*.2f,unit*.2f,paint);paint.setColor(0xeeffffff);paint.setTextAlign(Paint.Align.CENTER);paint.setTextSize(unit*.24f);canvas.drawText(c.label,c.rect.centerX(),c.rect.centerY()-(paint.ascent()+paint.descent())/2,paint);}
    }
    private void control(Control c,boolean down){if(c.key==-2||c.key==-3){if(down)NativeRuntime.event(4,0,c.key==-2?1000:-1000,0,0);return;}if(c.key<0)return;if(c.button>=0)NativeRuntime.event(2,c.button,down?1:0,0,0);else NativeRuntime.event(1,c.key,0,down?1:0,0);}
    void release(){for(Control c:new HashSet<>(pressed.values()))control(c,false);pressed.clear();looking.clear();dragged.clear();NativeRuntime.release();invalidate();}
    @Override public boolean onTouchEvent(MotionEvent event){
        int action=event.getActionMasked();if(action==MotionEvent.ACTION_CANCEL){release();return true;}
        int index=event.getActionIndex();if(index<0||index>=event.getPointerCount())return true;
        int id=event.getPointerId(index);
        if(action==MotionEvent.ACTION_DOWN||action==MotionEvent.ACTION_POINTER_DOWN){
            if(getWidth()<1||getHeight()<1)return true;float x=event.getX(index),y=event.getY(index);Control hit=null;for(Control c:controls)if(c.rect.contains(x,y)){hit=c;break;}
            if(hit!=null){boolean was=pressed.containsValue(hit);pressed.put(id,hit);if(!was)control(hit,true);}else {looking.put(id,new PointF(x,y));if(!NativeRuntime.captured())NativeRuntime.event(3,(int)(x/getWidth()*renderWidth*1000),(int)(y/getHeight()*renderHeight*1000),0,0);}invalidate();return true;
        }
        if(action==MotionEvent.ACTION_MOVE){for(int i=0;i<event.getPointerCount();i++){int pointer=event.getPointerId(i);PointF old=looking.get(pointer);if(old==null)continue;float x=event.getX(i),y=event.getY(i),dx=x-old.x,dy=y-old.y;if(Math.abs(dx)+Math.abs(dy)>2)dragged.add(pointer);if(NativeRuntime.captured())NativeRuntime.event(3,(int)(dx*sensitivity*1000),(int)(dy*sensitivity*1000),1,0);else NativeRuntime.event(3,(int)(x/getWidth()*renderWidth*1000),(int)(y/getHeight()*renderHeight*1000),0,0);old.set(x,y);}return true;}
        if(action==MotionEvent.ACTION_UP||action==MotionEvent.ACTION_POINTER_UP){Control c=pressed.remove(id);Runnable selected=c==exitControl?exitAction:c==keyboardControl?keyboardAction:null;if(c!=null&&selected!=null&&c.rect.contains(event.getX(index),event.getY(index))){release();selected.run();performClick();return true;}if(c!=null&&!pressed.containsValue(c))control(c,false);else if(looking.containsKey(id)&&!dragged.contains(id)&&!NativeRuntime.captured()){NativeRuntime.event(2,0,1,0,0);NativeRuntime.event(2,0,0,0,0);}looking.remove(id);dragged.remove(id);invalidate();performClick();return true;}
        return true;
    }
    @Override public boolean performClick(){super.performClick();return true;}
    static int glfwKey(int key){if(key>=KeyEvent.KEYCODE_A&&key<=KeyEvent.KEYCODE_Z)return 65+key-KeyEvent.KEYCODE_A;if(key>=KeyEvent.KEYCODE_0&&key<=KeyEvent.KEYCODE_9)return 48+key-KeyEvent.KEYCODE_0;
        switch(key){case KeyEvent.KEYCODE_SPACE:return 32;case KeyEvent.KEYCODE_ESCAPE:case KeyEvent.KEYCODE_BACK:return 256;case KeyEvent.KEYCODE_ENTER:return 257;case KeyEvent.KEYCODE_TAB:return 258;case KeyEvent.KEYCODE_DEL:return 259;case KeyEvent.KEYCODE_FORWARD_DEL:return 261;case KeyEvent.KEYCODE_DPAD_RIGHT:return 262;case KeyEvent.KEYCODE_DPAD_LEFT:return 263;case KeyEvent.KEYCODE_DPAD_DOWN:return 264;case KeyEvent.KEYCODE_DPAD_UP:return 265;case KeyEvent.KEYCODE_SHIFT_LEFT:return 340;case KeyEvent.KEYCODE_SHIFT_RIGHT:return 344;case KeyEvent.KEYCODE_CTRL_LEFT:return 341;case KeyEvent.KEYCODE_CTRL_RIGHT:return 345;case KeyEvent.KEYCODE_ALT_LEFT:return 342;case KeyEvent.KEYCODE_ALT_RIGHT:return 346;default:return -1;}}
}
