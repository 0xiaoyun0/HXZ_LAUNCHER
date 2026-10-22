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
    private final Map<Integer,GamePointerGesture> looking=new HashMap<>();
    private final float touchSlop;
    private final GameMouseState mouse=new GameMouseState();
    private boolean mousePresent;
    private int mouseModifiers;
    private final GameMouseState.Output mouseOutput=(button,down)->NativeRuntime.event(2,button,down?1:0,mouseModifiers,0);
    private final Runnable captureCheck=new Runnable(){@Override public void run(){updateMouseCapture();postDelayed(this,200);}};
    private float unit,desiredUnit,sensitivity=1;private int renderWidth=1280,renderHeight=720;private Runnable exitAction,keyboardAction,diagnosticAction;private Control exitControl,keyboardControl,diagnosticControl;
    GameControlsView(Context context){super(context);touchSlop=ViewConfiguration.get(context).getScaledTouchSlop();setFocusableInTouchMode(true);setContentDescription("游戏触控：左侧移动，右侧视角，右下角跳跃与操作");}
    void setExitAction(Runnable action){exitAction=action;}
    void setKeyboardAction(Runnable action){keyboardAction=action;}
    void setDiagnosticAction(Runnable action){diagnosticAction=action;}
    void configure(float size,float sensitivity,int w,int h){release();desiredUnit=getResources().getDisplayMetrics().density*48*Math.max(.7f,Math.min(1.5f,size));this.sensitivity=Math.max(.25f,Math.min(3,sensitivity));renderWidth=w;renderHeight=h;layoutControls();invalidate();}
    private void layoutControls(){
        if(desiredUnit==0)desiredUnit=48*getResources().getDisplayMetrics().density;controls.clear();exitControl=null;keyboardControl=null;diagnosticControl=null;
        if(getWidth()<1||getHeight()<1)return;GameTouchLayout layout=new GameTouchLayout(getWidth(),getHeight(),desiredUnit);unit=layout.unit;
        for(GameTouchLayout.Item item:layout.items){Control c=new Control(new RectF(item.x,item.y,item.x+item.width,item.y+item.height),item.label,item.key,item.button);controls.add(c);if(item.key==GameTouchLayout.EXIT)exitControl=c;if(item.key==GameTouchLayout.KEYBOARD)keyboardControl=c;if(item.key==GameTouchLayout.DIAGNOSTICS)diagnosticControl=c;}
    }
    @Override protected void onSizeChanged(int w,int h,int oldw,int oldh){release();layoutControls();}
    @Override public void onWindowFocusChanged(boolean hasFocus){super.onWindowFocusChanged(hasFocus);if(!hasFocus){release();if(hasPointerCapture())releasePointerCapture();}else updateMouseCapture();}
    @Override protected void onAttachedToWindow(){super.onAttachedToWindow();post(captureCheck);}
    @Override protected void onDetachedFromWindow(){removeCallbacks(captureCheck);release();if(hasPointerCapture())releasePointerCapture();super.onDetachedFromWindow();}
    @Override protected void onDraw(Canvas canvas){
        for(Control c:controls){boolean down=pressed.containsValue(c);paint.setColor(down?0x995b68cb:0x66313a55);canvas.drawRoundRect(c.rect,unit*.2f,unit*.2f,paint);paint.setColor(0xeeffffff);paint.setTextAlign(Paint.Align.CENTER);paint.setTextSize(unit*.24f);canvas.drawText(c.label,c.rect.centerX(),c.rect.centerY()-(paint.ascent()+paint.descent())/2,paint);}
    }
    private void control(Control c,boolean down){if(c.key==-2||c.key==-3){if(down)NativeRuntime.event(4,0,c.key==-2?1000:-1000,0,0);return;}if(c.key<0)return;if(c.button>=0)NativeRuntime.event(2,c.button,down?1:0,0,0);else NativeRuntime.event(1,c.key,0,down?1:0,0);}
    void release(){for(Control c:new HashSet<>(pressed.values()))control(c,false);pressed.clear();looking.clear();mouse.release(mouseOutput);mouseModifiers=0;NativeRuntime.release();invalidate();}
    @Override public boolean onTouchEvent(MotionEvent event){
        if(handleMouseEvent(event))return true;
        int action=event.getActionMasked();if(action==MotionEvent.ACTION_CANCEL){release();return true;}
        int index=event.getActionIndex();if(index<0||index>=event.getPointerCount())return true;
        int id=event.getPointerId(index);
        if(action==MotionEvent.ACTION_DOWN||action==MotionEvent.ACTION_POINTER_DOWN){
            if(getWidth()<1||getHeight()<1)return true;float x=event.getX(index),y=event.getY(index);Control hit=null;for(Control c:controls)if(c.rect.contains(x,y)){hit=c;break;}
            if(hit!=null){boolean was=pressed.containsValue(hit);pressed.put(id,hit);if(!was)control(hit,true);}else {boolean captured=NativeRuntime.captured();looking.put(id,new GamePointerGesture(x,y,touchSlop,captured));if(!captured)NativeRuntime.event(3,(int)(x/getWidth()*renderWidth*1000),(int)(y/getHeight()*renderHeight*1000),0,0);}invalidate();return true;
        }
        if(action==MotionEvent.ACTION_MOVE){for(int i=0;i<event.getPointerCount();i++){GamePointerGesture old=looking.get(event.getPointerId(i));if(old==null)continue;float x=event.getX(i),y=event.getY(i),dx=x-old.x,dy=y-old.y;boolean captured=NativeRuntime.captured();if(old.update(x,y,captured))continue;if(captured)NativeRuntime.event(3,(int)(dx*sensitivity*1000),(int)(dy*sensitivity*1000),1,0);else NativeRuntime.event(3,(int)(x/getWidth()*renderWidth*1000),(int)(y/getHeight()*renderHeight*1000),0,0);}return true;}
        if(action==MotionEvent.ACTION_UP||action==MotionEvent.ACTION_POINTER_UP){Control c=pressed.remove(id);Runnable selected=c==exitControl?exitAction:c==keyboardControl?keyboardAction:c==diagnosticControl?diagnosticAction:null;if(c!=null&&selected!=null&&c.rect.contains(event.getX(index),event.getY(index))){release();selected.run();performClick();return true;}if(c!=null&&!pressed.containsValue(c))control(c,false);GamePointerGesture gesture=looking.remove(id);if(gesture!=null){gesture.update(event.getX(index),event.getY(index),NativeRuntime.captured());if(gesture.canClick()){NativeRuntime.event(2,0,1,0,0);NativeRuntime.event(2,0,0,0,0);}}invalidate();performClick();return true;}
        return true;
    }
    @Override public boolean performClick(){super.performClick();return true;}
    static int glfwKey(int key){return GameKeyMap.glfwKey(key);}
    private void updateMouseCapture(){
        boolean wanted=mousePresent&&isShown()&&isAttachedToWindow()&&hasWindowFocus()&&NativeRuntime.captured();
        if(wanted&&!hasPointerCapture()){requestFocus();requestPointerCapture();}
        else if(!wanted&&hasPointerCapture())releasePointerCapture();
    }
    boolean handleMouseKeyEvent(KeyEvent event){
        int button=event.getKeyCode()==KeyEvent.KEYCODE_BACK?1:event.getKeyCode()==KeyEvent.KEYCODE_HOME?2:-1;
        if(button<0||event.getAction()!=KeyEvent.ACTION_DOWN&&event.getAction()!=KeyEvent.ACTION_UP)return false;
        InputDevice device=event.getDevice();
        boolean mouseSource=event.isFromSource(InputDevice.SOURCE_MOUSE)||event.isFromSource(InputDevice.SOURCE_MOUSE_RELATIVE)
                ||device!=null&&device.supportsSource(InputDevice.SOURCE_MOUSE)&&!device.supportsSource(InputDevice.SOURCE_KEYBOARD);
        if(!mouseSource)return false;
        mousePresent=true;mouseModifiers=GameKeyMap.modifiers(event.getMetaState());
        mouse.edge(button,event.getAction()==KeyEvent.ACTION_DOWN,mouseOutput);updateMouseCapture();return true;
    }
    @Override public boolean onGenericMotionEvent(MotionEvent event){return handleMouseEvent(event)||super.onGenericMotionEvent(event);}
    @Override public boolean onCapturedPointerEvent(MotionEvent event){return handleMouseEvent(event);}
    boolean handleMouseEvent(MotionEvent event){
        if(!isShown()||!hasWindowFocus()||!(event.isFromSource(InputDevice.SOURCE_MOUSE)||event.isFromSource(InputDevice.SOURCE_MOUSE_RELATIVE)))return false;
        mousePresent=true;mouseModifiers=GameKeyMap.modifiers(event.getMetaState());
        int action=event.getActionMasked();boolean captured=NativeRuntime.captured();
        if(action==MotionEvent.ACTION_CANCEL){mouse.release(mouseOutput);return true;}
        boolean relative=event.isFromSource(InputDevice.SOURCE_MOUSE_RELATIVE);
        if(event.getPointerCount()>0){
            if(relative&&captured&&action==MotionEvent.ACTION_MOVE){
                float dx=event.getX(),dy=event.getY();
                for(int i=0;i<event.getHistorySize();i++){dx+=event.getHistoricalX(i);dy+=event.getHistoricalY(i);}
                NativeRuntime.event(3,(int)(dx*sensitivity*1000),(int)(dy*sensitivity*1000),1,0);
            }else if(!relative&&!captured){
                NativeRuntime.event(3,GameMouseState.coordinate(event.getX(),getWidth(),renderWidth),GameMouseState.coordinate(event.getY(),getHeight(),renderHeight),0,0);
            }
        }
        // Scroll/hover can carry stale button snapshots on devices that also synthesize BACK.
        if(action==MotionEvent.ACTION_DOWN||action==MotionEvent.ACTION_UP||action==MotionEvent.ACTION_MOVE
                ||action==MotionEvent.ACTION_BUTTON_PRESS||action==MotionEvent.ACTION_BUTTON_RELEASE){
            mouse.snapshot(action==MotionEvent.ACTION_UP?0:event.getButtonState(),mouseOutput);
        }
        if(action==MotionEvent.ACTION_SCROLL)NativeRuntime.event(4,(int)(event.getAxisValue(MotionEvent.AXIS_HSCROLL)*1000),(int)(event.getAxisValue(MotionEvent.AXIS_VSCROLL)*1000),0,0);
        updateMouseCapture();return true;
    }
}
