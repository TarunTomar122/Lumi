# Contributing to Lumi

First off, thank you for considering contributing to Lumi! It's people like you that make Lumi such a great tool.

We welcome any type of contribution, not only code. You can help with 
- **QA**: file bugs and help us verify fixes.
- **Community**: help other users with their questions.
- **Code**: contribute bug fixes or new features.

## Getting Started

### Prerequisites
- [Node.js](https://nodejs.org/) (v18 or newer)
- [Yarn](https://yarnpkg.com/)
- [Expo Go](https://expo.dev/client) app on your mobile device for development.

### Setup

1.  **Fork the repository** on GitHub.
2.  **Clone your fork** to your local machine:
    ```bash
    git clone https://github.com/YOUR_USERNAME/lumi.git
    cd lumi
    ```
3.  **Install dependencies**:
    ```bash
    yarn install
    ```
4.  **Run the app**:
    - To run on your mobile device using Expo Go:
      ```bash
      yarn start
      ```
      Then scan the QR code with the Expo Go app.
    - To run on an Android emulator/device:
      ```bash
      yarn android
      ```
    - To run on an iOS simulator/device:
      ```bash
      yarn ios
      ```

## How to Contribute

1.  **Find an issue to work on.** Look for issues tagged with `good first issue` or `help wanted`. You can also file a new issue if you've found a bug or have a feature idea.
2.  **Create a new branch** for your changes:
    ```bash
    git checkout -b your-branch-name
    ```
3.  **Make your changes.** Make sure to follow the existing code style.
4.  **Test your changes** to make sure they work as expected.
5.  **Commit your changes** with a descriptive commit message.
6.  **Push your branch** to your fork:
    ```bash
    git push origin your-branch-name
    ```
7.  **Open a pull request** to the `main` branch of the Lumi repository. Provide a clear description of your changes and why they are needed.

## Code of Conduct

By contributing to Lumi, you agree to abide by our [Code of Conduct](CODE_OF_CONDUCT.md). Please read it to understand the standards of behavior we expect from our community.

Thank you for your contribution!
