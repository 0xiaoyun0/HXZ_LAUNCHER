import {useSnapshot} from 'valtio';
import {community} from '../../../../packages/community/client';
import {music,shareMusic} from '../music-player';
import {perform} from '../model';
import {Button} from '../ui';

export function RoomPlayer(){
  const room=useSnapshot(community),player=useSnapshot(music);
  return <section className="desktop-panel"><h2>一起听</h2><div className="desktop-panel-body desk-actions"><span>{player.current?.title||'先在音乐播放器选择一首歌曲'}</span>
    <Button disabled={!room.room||(!player.playing&&!room.musicSharing)} onClick={()=>perform(()=>shareMusic(!room.musicSharing))}>{room.musicSharing?'停止分享音乐':'分享当前播放'}</Button>
  </div></section>;
}
