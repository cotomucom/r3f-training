import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

// マークダウン文字列を読みやすく整形して表示するコンポーネント。
// 教材テキストをそのまま渡すだけで、見出し・コード・テーブル等を適切にレンダリングする。
type Props = { content: string };

export default function MarkdownViewer({ content }: Props) {
  return (
    <div className="markdown">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          // コードブロック: 言語ラベル付きで表示
          code({ className, children, ...rest }) {
            const match = /language-(\w+)/.exec(className || "");
            const isBlock =
              typeof children === "string" && children.includes("\n");
            if (isBlock || match) {
              return (
                <div className="markdown__code-block">
                  {match && (
                    <span className="markdown__code-lang">{match[1]}</span>
                  )}
                  <pre className={className}>
                    <code className={className} {...rest}>
                      {children}
                    </code>
                  </pre>
                </div>
              );
            }
            // インラインコード
            return (
              <code className="markdown__inline-code" {...rest}>
                {children}
              </code>
            );
          },
          // テーブル
          table({ children }) {
            return (
              <div className="markdown__table-wrap">
                <table>{children}</table>
              </div>
            );
          },
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}
