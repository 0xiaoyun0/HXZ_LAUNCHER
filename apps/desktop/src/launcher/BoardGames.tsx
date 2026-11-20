import { useEffect, useRef, useState } from 'react'
import { useParams, useSearchParams } from 'react-router-dom'
import { useSnapshot } from 'valtio'
import { Send } from 'lucide-react'
import { BOARD_GAMES, DIFFICULTIES } from '../../../../server/shared/board-catalog.mjs'
import { community } from '../../../../packages/community/client'
import { request, useData } from '../data'
import { ui } from '../model'
import { Button, Empty, Field, Segments, Select } from '../ui'
import { RankList } from './RankList'

const chessSymbols: any = {
    ak: '♔',
    aq: '♕',
    ar: '♖',
    ab: '♗',
    an: '♘',
    ap: '♙',
    bk: '♚',
    bq: '♛',
    br: '♜',
    bb: '♝',
    bn: '♞',
    bp: '♟'
  },
  xiangqiSymbols: any = {
    ak: '帥',
    aa: '仕',
    ae: '相',
    ah: '馬',
    ar: '車',
    ac: '炮',
    ap: '兵',
    bk: '將',
    ba: '士',
    be: '象',
    bh: '馬',
    br: '車',
    bc: '砲',
    bp: '卒'
  }
export function BoardRoute() {
  const { id } = useParams()
  return <BoardGame key={id} />
}
function BoardGame() {
  const [params] = useSearchParams()
  const { id } = useParams(),
    c = useSnapshot(community)
  const game = BOARD_GAMES.find((g: any) => g.id === id)
  const [match, setMatch] = useState<any>(null),
    [selection, setSelection] = useState(-1),
    [level, setLevel] = useState(1),
    [period, setPeriod] = useState('week'),
    [promotion, setPromotion] = useState('q'),
    [comment, setComment] = useState(''),
    [error, setError] = useState(''),
    [busy, setBusy] = useState(false),
    [now, setNow] = useState(Date.now())
  const matchRef = useRef<any>(null),
    busyRef = useRef(false),
    generation = useRef(0)
  matchRef.current = match
  busyRef.current = busy
  useEffect(() => {
    let active = true
    const target = params.get('match')
    if (target && c.connected)
      void request('/api/boards/' + encodeURIComponent(target))
        .then((v) => {
          if (active && v.game === id) setMatch(v)
        })
        .catch((e) => {
          if (active) setError(e.message)
        })
    return () => {
      active = false
    }
  }, [params, id, c.connected])
  const lobby = useData(() => request('/api/boards'), [id, c.connected]),
    ranking = useData(() => request('/api/arcade/' + id + '?period=' + period), [id, period, c.connected])
  useEffect(() => {
    let loading = false,
      alive = true,
      pending = false,
      lastPoll = 0
    const refresh = async () => {
      if (document.hidden) return
      if (busyRef.current || loading) {
        pending = true
        return
      }
      loading = true
      pending = false
      lastPoll = Date.now()
      const m = matchRef.current,
        gen = generation.current
      try {
        if (m && !m.state.winner) {
          const value = await request('/api/boards/' + m.id)
          if (
            alive &&
            !busyRef.current &&
            generation.current === gen &&
            matchRef.current?.id === m.id &&
            matchRef.current.state.ply <= value.state.ply
          )
            setMatch(value)
        } else if (!m) await lobby.reload()
      } catch (e: any) {
        if (alive) setError(e.message)
      } finally {
        loading = false
        if (pending && alive && !busyRef.current) queueMicrotask(refresh)
      }
    }
    const onChange = (event: any) => {
      if (!event.detail || event.detail.game === id || event.detail.id === matchRef.current?.id)
        void refresh()
    }
    const onVisible = () => {
      if (!document.hidden) void refresh()
    }
    window.addEventListener('hxz-board', onChange)
    document.addEventListener('visibilitychange', onVisible)
    const timer = setInterval(() => {
      setNow(Date.now())
      if (pending || Date.now() - lastPoll > 6000) void refresh()
    }, 1000)
    return () => {
      alive = false
      clearInterval(timer)
      window.removeEventListener('hxz-board', onChange)
      document.removeEventListener('visibilitychange', onVisible)
    }
  }, [id])
  const run = async (fn: () => Promise<any>) => {
    if (busyRef.current) return
    busyRef.current = true
    setBusy(true)
    setError('')
    generation.current++
    try {
      await fn()
    } catch (e: any) {
      setError(e.message)
    } finally {
      busyRef.current = false
      setBusy(false)
      window.dispatchEvent(new CustomEvent('hxz-board', { detail: { game: id } }))
    }
  }
  if (!game) return <Empty title="未找到这个游戏" />
  const width = id === 'gomoku' ? 15 : id === 'xiangqi' ? 9 : 8,
    height = id === 'xiangqi' ? 10 : width
  const myTurn = match?.side === match?.state.turn && !match?.state.winner && !!match?.b
  const dest = new Set(
    (match?.legal || []).filter((m: any) => id === 'gomoku' || m.from === selection).map((m: any) => m.to)
  )
  const cells = (match?.state.board || Array(width * height).fill(''))
    .map((piece: any, i: number) => ({ piece, i }))
    .sort((a: any, b: any) => (match?.side === 'b' ? b.i - a.i : a.i - b.i))
  const status = !match
    ? '选择模式，开始一局'
    : match.state.winner
      ? match.state.winner === 'draw'
        ? '和棋'
        : match.state.winner === match.side
          ? '你赢了'
          : '本局结束'
      : !match.b
        ? '等待另一位旅人'
        : match.thinking
          ? '机器人正在思考'
          : (match[match.state.turn]?.name || '玩家') + ' 行棋' + (myTurn ? ' · 轮到你' : '')
  const click = async (i: number) => {
    if (!myTurn || busy) return
    const p = match.state.board[i]
    if (id !== 'gomoku' && p?.[0] === match.side) {
      setSelection(i)
      return
    }
    const moves = match.legal.filter((m: any) => m.to === i && (id === 'gomoku' || m.from === selection))
    if (!moves.length) return
    await run(async () => {
      setMatch(
        await request('/api/boards/' + match.id, 'POST', {
          action: 'move',
          ply: match.state.ply,
          move: moves.find((m: any) => m.promotion === promotion) || moves[0]
        })
      )
      setSelection(-1)
    })
  }
  return (
    <div className="game-workspace board-workspace">
      <section className="board-main">
        <div className="game-heading">
          <div>
            <small>{game.tag}</small>
            <h2>{game.name}</h2>
          </div>
          <strong className="turn-status" aria-live="polite">
            {status}
          </strong>
        </div>
        {match && (
          <div className="board-players">
            <span className={match.state.turn === 'a' ? 'active' : ''}>{match.a.name}</span>
            <span>{match.state.ply} 手</span>
            <span className={match.state.turn === 'b' ? 'active' : ''}>{match.b?.name || '空席'}</span>
          </div>
        )}
        <div className={'strategy-board ' + id} style={{ '--columns': width, '--rows': height } as any}>
          {cells.map(({ piece, i }: any) => (
            <button
              key={i}
              className={
                'board-cell ' +
                (((i % width) + Math.floor(i / width)) % 2 ? 'dark ' : '') +
                (selection === i ? 'chosen ' : '') +
                (match?.state.last?.to === i ? 'last ' : '') +
                (piece?.[0] === 'a' ? 'side-a' : 'side-b')
              }
              disabled={!myTurn || busy}
              aria-label={
                (id === 'chess'
                  ? chessSymbols[piece]
                  : id === 'xiangqi'
                    ? xiangqiSymbols[piece]
                    : piece
                      ? '棋子'
                      : '空位') +
                ' ' +
                ((i % width) + 1) +
                ',' +
                (Math.floor(i / width) + 1)
              }
              onClick={() => click(i)}
            >
              {piece ? (
                <span
                  className="piece"
                  key={piece + ':' + (match?.state.last?.to === i ? match.state.ply : 0)}
                >
                  {id === 'chess' ? chessSymbols[piece] : id === 'xiangqi' ? xiangqiSymbols[piece] : ''}
                </span>
              ) : myTurn && dest.has(i) && selection >= 0 ? (
                <i />
              ) : null}
            </button>
          ))}
          {!match && (
            <div className="board-intro">
              <img src={'./media/games/' + id + '.webp'} alt="" />
              <b>{game.symbol}</b>
              <span>落子之间，各有天地</span>
            </div>
          )}
          {match?.spectator && (
            <div className="spectator-overlay">
              {(match.comments || [])
                .filter((v: any) => now - v.created < 8000)
                .slice(-4)
                .map((v: any, i: number) => (
                  <span key={v.id} style={{ top: 12 + i * 16 + '%' }}>
                    {v.name}：{v.text}
                  </span>
                ))}
            </div>
          )}
        </div>
        {match && (
          <div className="board-footer">
            <small>
              {match.state.winner
                ? '对局结束'
                : match.b
                  ? '每步剩余 ' + Math.max(0, Math.ceil(((match.deadline || 0) - now) / 1000)) + ' 秒'
                  : '等待加入'}
            </small>
            <Button
              onClick={() => {
                if (match.spectator || match.state.winner) {
                  setMatch(null)
                  void lobby.reload()
                  void ranking.reload()
                } else
                  ui.confirm = {
                    title: match.b ? '确认认输？' : '关闭房间？',
                    message: match.b ? '本局会判定对手获胜。' : '其他玩家将无法加入。',
                    action: () =>
                      run(async () =>
                        setMatch(await request('/api/boards/' + match.id, 'POST', { action: 'resign' }))
                      )
                  }
              }}
            >
              {match.spectator ? '退出观战' : match.state.winner ? '再来一局' : match.b ? '认输' : '关闭房间'}
            </Button>
          </div>
        )}
        {match?.spectator && (
          <div className="input-action">
            <input
              value={comment}
              maxLength={120}
              onChange={(e) => setComment(e.target.value)}
              placeholder="观众弹幕，对局玩家不可见"
            />
            <Button
              icon={Send}
              disabled={!comment.trim() || busy}
              onClick={() =>
                run(async () => {
                  setMatch(
                    await request('/api/boards/' + match.id, 'POST', { action: 'comment', text: comment })
                  )
                  setComment('')
                })
              }
            >
              发送
            </Button>
          </div>
        )}
        {match?.engineError && (
          <p className="inline-error" role="alert">
            {match.engineError}{' '}
            <Button
              disabled={busy}
              onClick={() =>
                run(async () =>
                  setMatch(await request('/api/boards/' + match.id, 'POST', { action: 'retry' }))
                )
              }
            >
              重试机器人
            </Button>
          </p>
        )}
        {match?.practice && <p className="muted">挑战练习 · 不计积分</p>}
        {error && <p className="inline-error">{error}</p>}
      </section>
      <aside className="game-aside">
        {!match || match.state.winner ? (
          <>
            <h3>开启对局</h3>
            <div className="difficulty">
              {DIFFICULTIES.map((d: string, i: number) => (
                <button key={d} className={level === i + 1 ? 'selected' : ''} onClick={() => setLevel(i + 1)}>
                  <b>{i + 1}</b>
                  <small>{d}</small>
                </button>
              ))}
            </div>
            <Button
              tone="solid"
              disabled={!c.connected || busy}
              onClick={() =>
                run(async () =>
                  setMatch(await request('/api/boards', 'POST', { game: id, mode: 'bot', level }))
                )
              }
            >
              挑战机器人 · {DIFFICULTIES[level - 1]}
            </Button>
            <Button
              disabled={!c.connected || busy}
              onClick={() =>
                run(async () =>
                  setMatch(await request('/api/boards', 'POST', { game: id, mode: 'online', level }))
                )
              }
            >
              创建联机房间
            </Button>
            <h3>社区棋桌</h3>
            {lobby.data?.items
              ?.filter((m: any) => m.game === id)
              .map((m: any) => (
                <Button
                  key={m.id}
                  disabled={busy}
                  onClick={() =>
                    run(async () =>
                      setMatch(
                        await request(
                          '/api/boards/' + m.id,
                          m.side || m.b ? 'GET' : 'POST',
                          m.side || m.b ? undefined : { action: 'join' }
                        )
                      )
                    )
                  }
                >
                  {m.a.name} · {m.side ? '继续' : m.b ? '观战' : '入座'}
                </Button>
              ))}
          </>
        ) : (
          <p>{game.description}</p>
        )}
        {id === 'chess' && match?.side && (
          <Field label="兵升变">
            <Select
              value={promotion}
              onChange={setPromotion}
              options={[
                { value: 'q', label: '后' },
                { value: 'r', label: '车' },
                { value: 'b', label: '象' },
                { value: 'n', label: '马' }
              ]}
            />
          </Field>
        )}
        <h3>机器人挑战榜</h3>
        <Segments
          value={period}
          onChange={setPeriod}
          items={[
            { id: 'week', label: '本周' },
            { id: 'all', label: '长期' }
          ]}
        />
        <RankList data={ranking.data} error={ranking.error} onRetry={ranking.reload} />
      </aside>
    </div>
  )
}
