/* HXZ integration bridge. SPDX-License-Identifier: GPL-3.0-or-later
 * Only converts protocol data and calls the Touhou Little Maid engines. */
package top.hxzmc.boards;

import org.teavm.jso.JSExport;
import org.teavm.jso.JSBody;
import com.github.tartaricacid.touhoulittlemaid.api.game.gomoku.*;

public final class Engine {
    @JSBody(params = {"move"}, script = "if (globalThis.hxzBoardCandidate) globalThis.hxzBoardCandidate(move);")
    private static native void candidate(int move);
    @JSExport public static int gomoku(String board, int last, int depth, int nodes, int vcx) {
        int[][] cells = new int[15][15];
        for(int i=0;i<225;i++) cells[i%15][i/15]=board.charAt(i)-'0';
        Point previous=last<0?new Point(7,7,2):new Point(last%15,last/15,cells[last%15][last/15]);
        var search=new ZhiZhangAIService(new AIService.AIConfig(depth,nodes,false,vcx,8));
        search.onIteration=move->candidate(move.y*15+move.x);
        Point move=search.getPoint(cells,previous);
        return move==null?-1:move.y*15+move.x;
    }
    @JSExport public static int xiangqi(String fen, int depth, int millis) {
        var p=new com.github.tartaricacid.touhoulittlemaid.api.game.xqwlight.Position();p.fromFen(fen);
        var search=new com.github.tartaricacid.touhoulittlemaid.api.game.xqwlight.Search(p,16);
        search.onIteration=Engine::candidate;
        return search.searchMain(depth,millis);
    }
    @JSExport public static int chess(String fen, int depth, int millis) {
        var p=new com.github.tartaricacid.touhoulittlemaid.api.game.chess.Position();p.fromFen(fen);
        var search=new com.github.tartaricacid.touhoulittlemaid.api.game.chess.Search(p,16);
        search.onIteration=Engine::candidate;
        return search.searchMain(depth,millis);
    }
}
