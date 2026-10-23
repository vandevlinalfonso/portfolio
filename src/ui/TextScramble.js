const CHARS = '█▓▒░<>/[]{}=+*^?#_01';

/**
 * Per-character decrypt/scramble text reveal.
 * Characters resolve from forensic noise into the target string.
 */
export default class TextScramble {
  constructor(el) {
    this.el = el;
    this.queue = [];
    this.frame = 0;
    this.frameRequest = null;
  }

  setText(newText) {
    const oldText = this.el.textContent;
    const length = Math.max(oldText.length, newText.length);

    cancelAnimationFrame(this.frameRequest);
    this.queue = [];

    for (let i = 0; i < length; i++) {
      const from = oldText[i] || '';
      const to = newText[i] || '';
      const start = Math.floor(Math.random() * 18);
      const end = start + Math.floor(Math.random() * 18);
      this.queue.push({ from, to, start, end, char: '' });
    }

    this.frame = 0;
    this.update();
  }

  update = () => {
    let output = '';
    let complete = 0;

    for (const item of this.queue) {
      if (this.frame >= item.end) {
        complete++;
        output += item.to;
      } else if (this.frame >= item.start) {
        if (!item.char || Math.random() < 0.28) {
          item.char = CHARS[Math.floor(Math.random() * CHARS.length)];
        }
        output += item.char;
      } else {
        output += item.from;
      }
    }

    this.el.textContent = output;

    if (complete < this.queue.length) {
      this.frameRequest = requestAnimationFrame(this.update);
      this.frame++;
    }
  };

  dispose() {
    cancelAnimationFrame(this.frameRequest);
  }
}
