import { useState, useEffect } from 'react'
import { FlowResult } from '@/types/form'
import { Message, Member } from '@/lib/models'
import Header from '@/components/Header'
import Footer from '@/components/Footer'
import FlowChooser from '@/components/FlowChooser'
import MessageFeed from '@/components/MessageFeed'
import TextFlow from '@/components/TextFlow'
import MultipleChoiceFlow from '@/components/MultipleChoiceFlow'

export interface SimulateFlowParams {
  flowId: number;
  member: Member;
  startIndex: number;
  message: string;
}

export async function simulateFlow({
  flowId,
  member,
  startIndex,
  message,
}: SimulateFlowParams): Promise<FlowResult> {
  const res = await fetch(`/api/flows/${flowId}/simulate`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      member,
      startIndex,
      message,
    }),
  })
  return res.json()
}

export async function initFlow(flowId: number, member: Member): Promise<FlowResult> {
  const res = await fetch(`/api/flows/${flowId}/${member.id || 0}`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
    }
  })
  return res.json()
}

export default function Home() {
  const [flowId, setFlowId] = useState(1)
  const [flowHeader, setFlowHeader] = useState('')
  const [query, setQuery] = useState('')
  const [scriptedMessages, setScriptedMessages] = useState([] as Message[])
  const [messageFeed, setMessageFeed] = useState([] as Message[])
  const [cursorIndex, setCursorIndex] = useState(0)
  const [isAwaitingUserInput, setIsAwaitingUserInput] = useState(true)
  const [member, setMember] = useState({name: 'guest', isSubscribed: false} as unknown as Member)

  const moveFlow = async (message: string) => {
    const {
      messages,
      stopIndex,
      member: memberData,
    } = await simulateFlow({
      flowId,
      member,
      startIndex: cursorIndex,
      message,
    })
    const isFinalMessage = !(messages?.length <= 1 || messages.every(({ type }) => type === 'message'))

    setIsAwaitingUserInput(isFinalMessage)
    setMember(memberData)

    if (messages.length) {
      setCursorIndex(stopIndex+1)
      setScriptedMessages(oldState => [...oldState, ...messages])
      setMessageFeed(oldState => [...oldState, ...messages])
    }
  }

  useEffect(() => {
    initFlow(flowId, {} as unknown as Member).then(({
      flowName,
      messages,
      stopIndex,
    }: FlowResult) => {
      setFlowHeader(flowName as string)
      setScriptedMessages(messages)
      setMessageFeed(messages)
      setCursorIndex(stopIndex+1)
    })
  }, [flowId])

  const { type: messageType, responses=[] } = messageFeed.length
    ? messageFeed[messageFeed.length-1]
    : { type: null }

  return (
    <div className="flex flex-col h-screen bg-gray-50">
      <Header pageName="Members" url="/members"/>

      <main className="h-full bg-gray-50">
        <div className="flex min-h-full flex-col py-12 sm:px-6 lg:px-8">
          <FlowChooser {...{
            setMessageFeed,
            setFlowId,
            flowHeader,
            setIsAwaitingUserInput,
            setQuery,
          }}/>

          <div className="flex flex-col flex-grow justify-between mt-8 sm:mx-auto sm:w-full sm:max-w-2xl">
            <MessageFeed {...{
              messageFeed,
              scriptedMessages,
              isAwaitingUserInput,
            }}/>

            <div className="h-24 mt-4 flex-grow">
              { messageFeed.length && isAwaitingUserInput && (
                messageType === 'message'|| messageType === 'getInfo'
                ? <TextFlow {...{
                    query,
                    isAwaitingUserInput,
                    setQuery,
                    moveFlow,
                    setMessageFeed,
                  }}/>
                : messageType === 'multipleChoice'
                ? <MultipleChoiceFlow {...{
                    responses,
                    moveFlow,
                    isAwaitingUserInput,
                    setMessageFeed,
                  }}/>
                : <p className="text-center">（ ^_^）Thank you for your submission!（^_^ ）</p>
              )}
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  )
}
