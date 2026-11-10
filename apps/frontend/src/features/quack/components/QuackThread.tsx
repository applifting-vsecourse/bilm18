import type { QuackMood } from "@/features/quack/api/quackSchemas"
import { QuackItem } from "@/features/quack/components/QuackItem"
import { QuackReplyActions } from "@/features/quack/components/QuackReplyActions"
import { ReplyForm } from "@/features/quack/components/ReplyForm"
import { ReplyingTo } from "@/features/quack/components/ReplyingTo"
import type { ThreadNode } from "@/features/quack/lib/buildThreadTree"
import { canDeleteQuack } from "@/features/quack/lib/canDeleteQuack"

type QuackThreadProps = {
  // From buildThreadTree.
  tree: ThreadNode
  // Briefly highlighted — the quack a link pointed at.
  highlightedId?: string
  onVote?: (quackId: string, optionId: string) => void
  // Same rule as the feed: the author, or an admin.
  currentUserId?: string
  isAdmin?: boolean
  onDelete?: (quackId: string) => void
  // The quack whose reply form is open, if any.
  replyFormFor?: string | null
  onReplyOpen?: (quackId: string) => void
  onReplyClose?: () => void
  defaultMood?: QuackMood
}

// Element id of a quack on the thread page — the target of `#<quackId>` links.
export const threadQuackElementId = (quackId: string) => quackId

export function QuackThread(props: QuackThreadProps) {
  return (
    <ThreadBranch
      {...props}
      node={props.tree}
    />
  )
}

function ThreadBranch({ node, ...props }: QuackThreadProps & { node: ThreadNode }) {
  const {
    highlightedId,
    onVote,
    currentUserId,
    isAdmin = false,
    onDelete,
    replyFormFor,
    onReplyOpen,
    onReplyClose,
    defaultMood,
  } = props
  const { quack } = node

  return (
    <>
      <QuackItem
        id={threadQuackElementId(quack.id)}
        isHighlighted={quack.id === highlightedId}
        quack={quack}
        onVote={onVote ? (optionId) => onVote(quack.id, optionId) : undefined}
        onDelete={
          onDelete && canDeleteQuack(quack, currentUserId, isAdmin)
            ? () => onDelete(quack.id)
            : undefined
        }
        isOwn={quack.userId === currentUserId}
        replyingTo={
          node.replyingTo ? <ReplyingTo username={node.replyingTo.username} /> : undefined
        }
      >
        <QuackReplyActions
          quack={quack}
          onReply={onReplyOpen ? () => onReplyOpen(quack.id) : undefined}
          shouldShowThreadLink={false}
        />
        {replyFormFor === quack.id && quack.user ? (
          <ReplyForm
            quackId={quack.id}
            authorUsername={quack.user.username}
            defaultMood={defaultMood}
            onClose={() => onReplyClose?.()}
            className="mt-2"
          />
        ) : null}
      </QuackItem>

      {node.replies.length > 0 ? (
        // A hairline on the left shows what the replies answer — no nested cards.
        <div className="ml-6 border-l border-border pl-3">
          {node.replies.map((reply) => (
            <ThreadBranch
              key={reply.quack.id}
              {...props}
              node={reply}
            />
          ))}
        </div>
      ) : null}
    </>
  )
}
