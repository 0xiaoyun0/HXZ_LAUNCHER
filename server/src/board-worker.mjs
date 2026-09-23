import { parentPort, workerData } from 'node:worker_threads';
import { botMove } from '../shared/board-games.mjs';
parentPort.postMessage(botMove(workerData.state,workerData.level));
