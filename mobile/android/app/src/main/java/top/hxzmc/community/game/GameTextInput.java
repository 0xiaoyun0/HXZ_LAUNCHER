package top.hxzmc.community.game;

import java.util.function.IntConsumer;

/** Keep a single submission below the native input queue's bound; Unicode uses code points. */
final class GameTextInput {
    static int send(String text,IntConsumer output){
        int sent=0;
        for(int offset=0;offset<text.length()&&sent<256;){
            int code=text.codePointAt(offset);offset+=Character.charCount(code);
            if(Character.isISOControl(code)||code>=0xd800&&code<=0xdfff)continue;
            output.accept(code);sent++;
        }
        return sent;
    }
}
