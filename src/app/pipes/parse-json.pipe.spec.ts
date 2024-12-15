import { ParseJSONPipe } from './parse-json.pipe';

describe('ParseJSONPipe', () => {
  it('create an instance', () => {
    const pipe = new ParseJSONPipe();
    expect(pipe).toBeTruthy();
  });
});
