import { Component, type ReactNode } from "react";

type Props = { children: ReactNode };
type State = { error: Error | null };

/** Catches render-time errors in the widget subtree so one bad widget won't
 * take down the whole note view. Matches macaron's "last good frame" resilience:
 * if a frame throws, we show the error instead of crashing. */
export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: unknown) {
    console.error("[ui4a] widget render error", error, info);
  }

  render() {
    if (this.state.error) {
      return <pre className="ui4a-error">{this.state.error.message}</pre>;
    }
    return this.props.children;
  }
}
