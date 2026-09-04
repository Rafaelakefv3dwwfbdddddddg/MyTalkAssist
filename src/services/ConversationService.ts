export type MessageSender = 'user' | 'other';

export type MessageStatus =
    | 'draft'
    | 'speaking'
    | 'listening'
    | 'processing'
    | 'confirmed';

export type ConversationMessage = {
    id: string;
    sender: MessageSender;
    text: string;
    status: MessageStatus;
    confidence?: number;
};

class ConversationService {
    createMessage(sender: MessageSender, text: string, status: MessageStatus = 'confirmed', confidence?: number): ConversationMessage {
        return {
            id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
            sender,
            text: text.trim(),
            status,
            confidence,
        };
    }

    addMessage(messages: ConversationMessage[], message: ConversationMessage) {
        return [...messages, message];
    }

    updateMessage(messages: ConversationMessage[], id: string, update: Partial<ConversationMessage>) {
        return messages.map((message) => message.id === id ? { ...message, ...update } : message);
    }
}

export default new ConversationService();
export { ConversationService };
