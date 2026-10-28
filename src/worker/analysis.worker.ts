import { handleAnalyze } from './handleAnalyze';
import type { AnalyzeRequest } from './messages';

self.onmessage = (event: MessageEvent<AnalyzeRequest>) =>
  void handleAnalyze(event.data, (message) => {
    self.postMessage(message);
  });
