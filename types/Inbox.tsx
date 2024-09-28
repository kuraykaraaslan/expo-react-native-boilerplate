import Message from './Message';
import User from './User';

export default interface Inbox {
    inboxId: string;
    messages: Message[];
    users: User[];
}
