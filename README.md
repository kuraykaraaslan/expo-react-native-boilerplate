![logo](/static/logo.png)


# Zeus


This boilerplate provides a robust starting point for building mobile applications using Expo, React Native, Zustand for state management, Tailwind CSS for styling, and TypeScript. It's designed to help developers jumpstart their project with a well-structured, scalable, and easily maintainable codebase.

## Screenshots

<p align="center">
  <img src="/static/screenshots/home.png" width="200" />
  <img src="/static/screenshots/login.png" width="200" />
  <img src="/static/screenshots/register.png" width="200" />
</p>

## Features

- **Expo SDK**: Utilizes the latest Expo SDK to manage the native code easily and to access the Expo ecosystem for rapid development.
- **React Native**: Builds upon React Native for developing cross-platform mobile applications with native-like performance.
- **Zustand**: Using Zustand for state management
- **Tailwind CSS**: Incorporates Tailwind CSS for styling, enabling utility-first CSS directly in your JavaScript.
- **TypeScript**: Uses TypeScript for static type checking, enhancing code quality and maintainability.
- **React Navigation**: Integrated with React Navigation for routing and navigation in the app.
- **Prettier & ESLint**: Pre-configured with Prettier and ESLint for consistent code formatting and linting, following best practices.
- **Axios**: Includes Axios for making HTTP requests, with a pre-configured instance for easy API integration.
- **i18next**: Supports i18next for internationalization and localization of the app.

## Roadmap

- [x] Initial setup with Expo, React Native, Zustand, Tailwind CSS, and TypeScript.
- [x] Implement authentication flow with Zustand.
- [x] Add Axios for making HTTP requests.
- [x] Integrate i18next for internationalization and localization.
- [ ] Support dark mode and light mode themes.
- [ ] Add form validation with Formik and Yup.
- [ ] Implement unit tests with Jest and React Testing Library.
- [ ] Support for web and desktop platforms.

## Getting Started

Follow these instructions to set up the project locally. These instructions will get you a copy of the project up and running on your local machine for development and testing purposes.

### Prerequisites

- Node.js (LTS version)
- npm or Yarn
- Expo CLI

  ```sh
  npm install --global expo-cli
  ```

### Installation

1. Clone the repository:

   ```sh
   git clone https://github.com/kuraykaraaslan/zeus.git
   ```

2. Navigate to the project directory:

   ```sh
    cd zeus
    ```

3. Install the dependencies:

   ```sh
   npm install
   ```

4. Start the development server:

   ```sh
    npm start
    ```

5. Open the Expo Go app on your mobile device and scan the QR code to view the app.

## Usage

The project structure is designed to be as simple and scalable as possible. Here's an overview of the project structure:

- `actions`: Contains Axios instance and Redux actions.
- `assets`: Includes images, fonts, and other static assets.
- `components`: Contains reusable components that are used across the app.
- `constants`: Includes constant values used throughout the app.
- `libs`: Contains utility functions and helper classes.
- `types`: Includes TypeScript types and interfaces.

## Contributing

Contributions are what make the open-source community such an amazing place to learn, inspire, and create. Any contributions you make are greatly appreciated.

1. Fork the project.
2. Create your feature branch (`git checkout -b feature/AmazingFeature`).
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`).
4. Push to the branch (`git push origin feature/AmazingFeature`).
5. Open a pull request.

