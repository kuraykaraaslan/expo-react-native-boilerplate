/*
    {
        "notificationId": "cm1zcb4wa0003108alip1iow8",
        "userId": "cm0kqkxks0000v5f30uxzibs3",
        "tenantId": null,
        "type": "INFO",
        "title": "Login Notification",
        "message": "You have successfully logged in from null",
        "read": false,
        "createdAt": "2024-10-07T18:23:03.562Z",
        "updatedAt": "2024-10-07T18:23:03.562Z",
        "additionalData": null
    }
*/

export default interface Notification {
    notificationId?: string
    userId: string
    tenantId?: string
    type: string
    title: string
    message: string
    read: boolean
    createdAt: Date
    updatedAt: Date
    additionalData?: any
}