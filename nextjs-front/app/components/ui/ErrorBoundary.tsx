"use client";

import { Component, type ReactNode } from "react";

type Props = {
  children: ReactNode;
  /** 子のレンダリングが失敗したときに代わりに表示する要素 */
  fallback?: ReactNode;
};

type State = { hasError: boolean };

/** 子のレンダリング中の例外を受け止めて、ページ全体が落ちるのを防ぐ */
export default class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch(error: unknown) {
    console.error(error);
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback ?? null;
    }
    return this.props.children;
  }
}
