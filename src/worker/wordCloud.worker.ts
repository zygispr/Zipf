import { placeWords } from '../lib/placeWords';
import type { WordCloudRequest, WordCloudResponse } from './wordCloudMessages';

const respond = (message: WordCloudResponse) => {
  self.postMessage(message);
};

// d3-cloud only needs a 2D canvas to measure and rasterize text; OffscreenCanvas provides one here.
const createCanvas = () => new OffscreenCanvas(1, 1) as unknown as HTMLCanvasElement;

self.onmessage = ({ data: { words, width, height } }: MessageEvent<WordCloudRequest>) => {
  try {
    placeWords(words, { width, height }, createCanvas).layout.then(
      (placed) => {
        respond({ type: 'layout', words: placed });
      },
      () => {
        respond({ type: 'error' });
      },
    );
  } catch {
    // For example, no OffscreenCanvas: the chart explains it and points to the other views.
    respond({ type: 'error' });
  }
};
