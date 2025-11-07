import { Icon } from '@/components/Common/Iconify/icons';
import { observer } from "mobx-react-lite";
import { Button } from "@heroui/react";
import { ScrollArea, ScrollAreaHandles } from "../Common/ScrollArea";
import { motion, AnimatePresence } from "framer-motion";
import { MarkdownRender } from "../Common/MarkdownRender";
import { AiStore, AssisantMessageMetadata } from "@/store/aiStore";
import { RootStore } from "@/store";
import { useEffect } from "react";
import { useRef } from "react";
import { BlinkoCard, BlinkoItem } from "../BlinkoCard";
import { DialogStandaloneStore } from "@/store/module/DialogStandalone";
import { IconButton } from "../Common/Editor/Toolbar/IconButton";
import copy from "copy-to-clipboard";
import { ToastPlugin } from "@/store/module/Toast/Toast";
import i18n from "@/lib/i18n";
import { BlinkoStore } from "@/store/blinkoStore";
import { NoteType } from "@shared/lib/types";
import { ToolUsageChip } from "./ToolComponents";
import { useMediaQuery } from "usehooks-ts";
import { useState } from "react";
import { Textarea } from "@heroui/react";
import { DialogStore } from "@/store/module/Dialog";
import { api } from '@/lib/trpc';
import { getBlinkoEndpoint } from '@/lib/blinkoEndpoint';

const EditMessageContent = ({ initialContent, onConfirm }: {
  initialContent: string;
  onConfirm: (content: string) => void;
}) => {
  const [editContent, setEditContent] = useState(initialContent);

  return (
    <div className="p-4">
      <div className="text-sm text-desc mb-4">
        {i18n.t('edit-message-warning')}
      </div>
      <Textarea
        value={editContent}
        onChange={(e) => setEditContent(e.target.value)}
        placeholder={i18n.t('enter-your-message')}
        minRows={4}
        maxRows={12}
        autoFocus
      />
      <div className="flex gap-2 mt-4 justify-end">
        <Button
          color="danger"
          variant="light"
          onPress={() => RootStore.Get(DialogStore).close()}
        >
          {i18n.t('cancel')}
        </Button>
        <Button
          color="primary"
          onPress={() => {
            if (editContent.trim()) {
              onConfirm(editContent.trim());
              RootStore.Get(DialogStore).close();
            }
          }}
          isDisabled={!editContent.trim()}
        >
          {i18n.t('confirm')}
        </Button>
      </div>
    </div>
  );
};

const UserMessage = ({ content, time, id, onEdit, shareMode = false }: {
  content: string;
  time: string;
  id?: number;
  onEdit?: (id: number, content: string) => void;
  shareMode?: boolean;
}) => {
  const isMobile = useMediaQuery('(max-width: 768px)');

  return (
    <motion.div
      className={`group flex flex-col w-full gap-1 ${shareMode ? 'mb-2' : ''}`}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <div className="ml-auto max-w-[100%] text-sm bg-background p-2 border border-border rounded-tl-2xl rounded-tr-2xl rounded-bl-2xl rounded-br-sm relative">
        {content}
      </div>

      {!!id && !shareMode && (
        <div className={`${isMobile ? 'opacity-70' : 'opacity-0 group-hover:opacity-100'} transition-opacity duration-200 ml-auto mb-2`}>
          <div className="flex gap-2 backdrop-blur-sm rounded-full p-1 items-center">
            <IconButton
              tooltip={i18n.t('edit')}
              icon="hugeicons:edit-02"
              onClick={() => onEdit?.(id, content)}
              size={18}
              containerSize={24}
            />

            <IconButton
              tooltip={i18n.t('copy')}
              icon="hugeicons:copy-01"
              onClick={() => {
                copy(content)
                RootStore.Get(ToastPlugin).success(i18n.t('operation-success'))
              }}
              size={18}
              containerSize={24}
            />
          </div>
        </div>
      )}
    </motion.div>
  );
};

const AiMessage = ({ content, withoutAnimation = false, withStreamAnimation = false, id, metadata, shareMode = false }:
  {
    content: string, withoutAnimation?: boolean, withStreamAnimation?: boolean, id?: number,
    metadata?: AssisantMessageMetadata,
    shareMode?: boolean
  }) => {
  const isMobile = useMediaQuery('(max-width: 768px)');

  return (
    <>
      {content.length > 0 && (
        <motion.div
          className={`group ${shareMode ? 'mb-2' : ''}`}
          initial={withoutAnimation ? {} : { opacity: 0, y: 20 }}
          exit={withoutAnimation ? {} : { opacity: 0, y: -20 }}
          animate={withoutAnimation ? {} : { opacity: 1, y: 0 }}
          transition={withoutAnimation ? {} : { duration: 0.3, ease: "easeOut" }}
        >
          <div className="max-w-[100%] bg-sencondbackground px-2 py-1 rounded-xl">
            <MarkdownRender content={content} />
          </div>
          <>
            {
              !!metadata?.notes?.length && metadata?.notes?.length > 0 && <div className="mt-2 flex flex-col gap-2">
                <div className="text-desc text-xs font-bold ml-1 select-none line-clamp-1 ">{i18n.t('ai-chat-box-notes')}</div>
                {
                  //@ts-ignore
                  metadata?.notes?.map((item: BlinkoItem) => (
                    <Button
                      key={item.id}
                      size="sm"
                      className="w-fit max-w-[400px] text-truncate"
                      onPress={async () => {
                        RootStore.Get(DialogStandaloneStore).setData({
                          isOpen: true,
                          onlyContent: true,
                          showOnlyContentCloseButton: true,
                          size: '4xl',
                          content: <BlinkoCard blinkoItem={item!} withoutHoverAnimation />
                        })
                      }}
                      endContent={<Icon icon="hugeicons:arrow-right-02" className='ml-auto' width="16" height="16" />}
                    >
                      <div className="text-xs font-bold ml-1 select-none line-clamp-1 text-truncate">{!!item.content ? item.content : i18n.t('no-title')}</div>
                    </Button>
                  ))
                }
              </div>
            }
          </>

          {
            !shareMode && (
              <div className={`${isMobile ? 'opacity-70' : 'opacity-0 group-hover:opacity-100'} transition-opacity duration-200 mb-4`}>
                <div className="flex gap-2  backdrop-blur-sm rounded-full p-1 items-center">
                  <IconButton
                    tooltip={i18n.t('add-to-blinko')}
                    icon="basil:lightning-solid"
                    classNames={{
                      icon: 'text-yellow-500'
                    }}
                    onClick={() => {
                      RootStore.Get(BlinkoStore).upsertNote.call({
                        content: content,
                        type: NoteType.BLINKO,
                      })
                    }}
                    size={20}
                    containerSize={25}
                  />

                  <IconButton
                    tooltip={i18n.t('add-to-note')}
                    icon="solar:notes-minimalistic-bold-duotone"
                    classNames={{
                      icon: 'text-blue-500'
                    }}
                    onClick={() => {
                      RootStore.Get(BlinkoStore).upsertNote.call({
                        content: content,
                        type: NoteType.NOTE
                      })
                    }}
                    size={20}
                    containerSize={25}
                  />

                  <IconButton
                    tooltip={i18n.t('copy')}
                    icon="hugeicons:copy-01"
                    onClick={() => {
                      copy(content)
                      RootStore.Get(ToastPlugin).success(i18n.t('operation-success'))
                    }}
                    size={20}
                    containerSize={25}
                  />
                  {
                    !!id && <IconButton
                      tooltip={i18n.t('refresh')}
                      icon="solar:refresh-outline"
                      onClick={() => {
                        RootStore.Get(AiStore).regenerate(id)
                      }}
                      size={20}
                      containerSize={25}
                    />
                  }
                  <IconButton
                    tooltip={i18n.t('share-conversation')}
                    icon="hugeicons:share-05"
                    onClick={async () => {
                      const aiStore = RootStore.Get(AiStore);
                      if (aiStore.currentConversation.value) {
                        try {
                          // First enable sharing for this conversation
                          await api.conversation.toggleShare.mutate({
                            id: aiStore.currentConversation.value.id,
                            isShare: true
                          });

                          // Create a longer, more aesthetically pleasing share ID
                          const conversationId = aiStore.currentConversation.value.id?.toString();
                          const shareData = `blinko-ai-share-${conversationId}`;
                          const encodedId = btoa(shareData);
                          const shareUrl = getBlinkoEndpoint(`/ai-share/${encodedId}`)
                          copy(shareUrl);
                          RootStore.Get(ToastPlugin).success(i18n.t('share-link-copied'));
                        } catch (error) {
                          console.error('Failed to share conversation:', error);
                          RootStore.Get(ToastPlugin).error(i18n.t('operation-failed'));
                        }
                      }
                    }}
                    size={20}
                    containerSize={25}
                  />

                  {
                    !!metadata?.usage?.totalTokens && <div className="ml-auto text-desc text-xs font-bold ml-1 select-none line-clamp-1">
                      {i18n.t('total-tokens')}: {metadata?.usage?.totalTokens} | {i18n.t('first-char-delay')}: {metadata?.fristCharDelay}ms
                    </div>
                  }

                </div>
              </div>)
          }
        </motion.div >
      )}
    </>
  );
};

export const BlinkoChatBox = observer(({ shareMode = false }: { shareMode?: boolean } = {}) => {
  const aiStore = RootStore.Get(AiStore)
  const scrollAreaRef = useRef<ScrollAreaHandles>(null)

  useEffect(() => {
    if (scrollAreaRef.current) {
      scrollAreaRef.current.scrollToBottom()
    }
  }, [aiStore.currentConversation.value, aiStore.currentMessageResult.content])

  const handleEditMessage = (id: number, content: string) => {
    if (shareMode) return; // Disable editing in share mode

    RootStore.Get(DialogStore).setData({
      isOpen: true,
      size: '2xl',
      title: i18n.t('edit-message'),
      content: (
        <EditMessageContent
          initialContent={content}
          onConfirm={(editedContent) => {
            aiStore.editUserMessage(id, editedContent);
          }}
        />
      )
    });
  }

  // Get the first message time for header display
  const firstMessageTime = aiStore.currentConversation.value?.messages?.[0]?.createdAt?.toLocaleString() || '';

  return (
    <ScrollArea
      ref={scrollAreaRef}
      onBottom={() => { }}
      className="h-full"
    >
      <div className="flex flex-col p-0 md:p-2 relative h-full w-[95%] md:w-[78%] mx-auto">
        {/* Chat time header */}
        {firstMessageTime && (
          <div className="text-center text-desc mb-4 text-xs">
            {firstMessageTime}
          </div>
        )}

        <AnimatePresence>
          {
            aiStore.currentConversation.value?.messages.find((item) => item.role == 'system') && (
              <div className="mx-auto text-desc text-xs text-center font-bold select-none line-clamp-1 p-3 border-2 border-ignore rounded-lg">
                {aiStore.currentConversation.value?.messages.find((item) => item.role == 'system')?.content}
              </div>
            )
          }
          {
            aiStore.currentConversation.value?.messages.map((item, index) => (
              <>
                {item.role == 'user' && (
                  <UserMessage
                    key={item.content}
                    content={item.content}
                    time={item.createdAt.toLocaleString()}
                    id={item.id}
                    onEdit={handleEditMessage}
                    shareMode={shareMode}
                  />
                )}
                {item.role == 'assistant' && (
                  <AiMessage
                    key={item.content}
                    id={item.id}
                    metadata={item.metadata as AssisantMessageMetadata}
                    content={item.content}
                    shareMode={shareMode}
                  />
                )}
              </>
            ))
          }

          {
            aiStore.isAnswering && !aiStore.currentMessageResult.content && (
              <Icon className="text-desc" icon="eos-icons:three-dots-loading" width="40" height="40" />
            )
          }

          {
            aiStore.currentMessageResult.toolcall.length > 0 && (
              <div className="my-2 flex flex-wrap">
                {aiStore.currentMessageResult.toolcall.map((item, index) => (
                  <ToolUsageChip key={`active-${item}-${index}`} toolName={item} index={index} />
                ))}
              </div>
            )
          }

          <AiMessage
            key="streaming-message"
            content={aiStore.currentMessageResult.content}
            withStreamAnimation
            metadata={aiStore.currentMessageResult}
            id={aiStore.currentMessageResult.id}
            shareMode={shareMode}
          />
        </AnimatePresence>
      </div>
    </ScrollArea>
  )
})