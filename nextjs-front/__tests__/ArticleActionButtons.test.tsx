import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import ArticleActionButtons from "@/app/components/ui/ArticleActionButtons";
import { fetchLikeStatus, setLike } from "@/app/lib/articleLike";

// vitestではSVGRが効かずSVGがURL文字列になるため、空のコンポーネントに置き換える
vi.mock("@/public/good_outline.svg", () => ({ default: () => null }));
vi.mock("@/app/lib/articleLike", () => ({
  fetchLikeStatus: vi.fn(),
  setLike: vi.fn(),
}));

const fetchLikeStatusMock = vi.mocked(fetchLikeStatus);
const setLikeMock = vi.mocked(setLike);

function likeButton(): HTMLButtonElement {
  return screen.getByRole("button") as HTMLButtonElement;
}

beforeEach(() => {
  vi.resetAllMocks();
});

afterEach(cleanup);

describe("ArticleActionButtons", () => {
  it("取得したいいね済みの状態と件数を出す", async () => {
    fetchLikeStatusMock.mockResolvedValue({ liked: true, like_count: 5 });

    render(<ArticleActionButtons articleId={1} likeCount={3} />);

    await waitFor(() =>
      expect(likeButton().getAttribute("aria-pressed")).toBe("true"),
    );
    expect(screen.getByText("good:5")).toBeDefined();
  });

  it("未ログインで押すとログインを案内し、APIは呼ばない", async () => {
    fetchLikeStatusMock.mockResolvedValue(null);

    render(<ArticleActionButtons articleId={1} likeCount={3} />);
    await waitFor(() => expect(likeButton().disabled).toBe(false));
    fireEvent.click(likeButton());

    expect(screen.getByText("ログイン")).toBeDefined();
    expect(setLikeMock).not.toHaveBeenCalled();
  });

  it("押すと応答を待たずに件数を増やし、応答の値で確定する", async () => {
    fetchLikeStatusMock.mockResolvedValue({ liked: false, like_count: 3 });
    let resolve!: (v: { liked: boolean; like_count: number }) => void;
    setLikeMock.mockReturnValue(new Promise((r) => (resolve = r)));

    render(<ArticleActionButtons articleId={1} likeCount={3} />);
    await waitFor(() => expect(likeButton().disabled).toBe(false));
    fireEvent.click(likeButton());

    expect(screen.getByText("good:4")).toBeDefined();
    expect(setLikeMock).toHaveBeenCalledWith(1, true);

    resolve({ liked: true, like_count: 10 });
    await waitFor(() => expect(screen.getByText("good:10")).toBeDefined());
  });

  it("失敗したら元の状態に戻してエラーを出す", async () => {
    fetchLikeStatusMock.mockResolvedValue({ liked: true, like_count: 3 });
    setLikeMock.mockRejectedValue(new Error("失敗"));

    render(<ArticleActionButtons articleId={1} likeCount={3} />);
    await waitFor(() => expect(likeButton().disabled).toBe(false));
    fireEvent.click(likeButton());

    await waitFor(() => expect(screen.getByRole("alert")).toBeDefined());
    expect(setLikeMock).toHaveBeenCalledWith(1, false);
    expect(screen.getByText("good:3")).toBeDefined();
    expect(likeButton().getAttribute("aria-pressed")).toBe("true");
  });
});
