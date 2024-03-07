interface User {
    id: number;
    name: string;
    email: string;
}

interface Users {
    users: User[];
}

export type { User, Users };