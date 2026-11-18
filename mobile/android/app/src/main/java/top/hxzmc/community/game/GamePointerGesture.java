package top.hxzmc.community.game;

/** A tap is bounded by distance from DOWN, even when every MOVE is very small. */
final class GamePointerGesture {
    private final float startX,startY,slopSquared;
    private boolean moved,captureChanged,lastCaptured;
    private final boolean startedCaptured;
    float x,y;
    GamePointerGesture(float x,float y,float slop,boolean captured){
        startX=this.x=x;startY=this.y=y;slopSquared=slop*slop;startedCaptured=lastCaptured=captured;
    }
    boolean update(float x,float y,boolean captured){
        boolean modeChanged=lastCaptured!=captured;
        float dx=x-startX,dy=y-startY;
        moved|=dx*dx+dy*dy>slopSquared;
        captureChanged|=captured!=startedCaptured;
        lastCaptured=captured;
        this.x=x;this.y=y;
        return modeChanged;
    }
    boolean canClick(){return !startedCaptured&&!captureChanged&&!moved;}
}
