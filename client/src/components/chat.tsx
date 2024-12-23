'use client'

import React, {useEffect, useState} from 'react'
import {useSocket} from '@/hooks/useSocket'
import {Input} from '@/components/ui/input'
import {Button} from '@/components/ui/button'
import {ScrollArea} from '@/components/ui/scroll-area'

type requestType = {
  user_id: string
  message: string
}

type responseType = {
  user_id: string
  message: string
}


export function Chat() {
  const [messages, setMessages] = useState<responseType[]>([])
  const [inputMessage, setInputMessage] = useState('')
  const socket = useSocket()

  useEffect(() => {
    if (socket) {
      socket.on('chat message', (message: responseType) => {
        setMessages((prevMessages) => [...prevMessages, message])
      })
    }
  }, [socket])

  const sendMessage = () => {
    if (inputMessage.trim() && socket) {
      const username = localStorage.getItem('username')
      const request: requestType = {
        user_id: username!,
        message: inputMessage
      }

      socket.emit('chat message', request)
      setInputMessage('')
    }
  }

  return (
      <div className="w-64 h-96 bg-white rounded-lg shadow-md flex flex-col">
        <ScrollArea className="flex-grow p-4">
          {messages.map((message) => (
              <div key={message.user_id} className="mb-2">
                <span className="font-bold">{message.message}: </span>
                {message.message}
              </div>
          ))}
        </ScrollArea>
        <div className="p-4 border-t">
          <Input
              type="text"
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              onKeyDownCapture={(e) => e.key === 'Enter' && sendMessage()}
              placeholder="Type a message..."
              className="mb-2"
          />
          <Button onClick={sendMessage}>Send</Button>
        </div>
      </div>
  )
}