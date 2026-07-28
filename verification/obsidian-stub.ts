export const noticeMessages: string[] = [];

export class Notice {
  constructor(message: string) {
    noticeMessages.push(message);
  }
}

export class MarkdownRenderChild {
  constructor(public containerEl: HTMLElement) {}
}
