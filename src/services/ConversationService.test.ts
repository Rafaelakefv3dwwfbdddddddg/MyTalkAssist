import ConversationService from './ConversationService';

function assertEqual<T>(actual: T, expected: T) {
    if (actual !== expected) throw new Error(`Expected ${String(expected)}, received ${String(actual)}`);
}

const first = ConversationService.createMessage('user', ' Eu quero beber água. ');
assertEqual(first.text, 'Eu quero beber água.');
assertEqual(first.sender, 'user');
assertEqual(first.status, 'confirmed');

const second = ConversationService.createMessage('other', 'Claro, vou pegar água.', 'processing', 0.8);
const messages = ConversationService.addMessage([first], second);
assertEqual(messages.length, 2);
assertEqual(messages[1].confidence, 0.8);

const updated = ConversationService.updateMessage(messages, second.id, { status: 'confirmed', text: 'Claro, vou pegar água para você.' });
assertEqual(updated[1].status, 'confirmed');
assertEqual(updated[1].text, 'Claro, vou pegar água para você.');
assertEqual(messages[1].status, 'processing');

console.log('ConversationService tests passed');
