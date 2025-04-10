# Client

## Installation

Make sure you have [`expo` installed](https://docs.expo.dev/more/expo-cli/#installation).

```bash
cnpm install expo expo-cli
```

Install packages:

```bash
npx expo start --web
```

Start the listener:

```bash
expo web
```

---

Wrong way

```bash
npm install -g expo

npm remove -g expo
npm remove -g expo-cli
```

```bash
# ┌───────────────────────────────────────────────────────────────────────────┐
# │                                                                           │
# │   The global expo-cli package has been deprecated.                        │
# │                                                                           │
# │   The new Expo CLI is now bundled in your project in the expo package.    │
# │   Learn more: https://blog.expo.dev/the-new-expo-cli-f4250d8e3421.        │
# │                                                                           │
# │   To use the local CLI instead (recommended in SDK 46 and higher), run:   │
# │   › npx expo <command>                                                    │
# │                                                                           │
# └───────────────────────────────────────────────────────────────────────────┘
# expo install
# $ expo web is not supported in the local CLI, please use npx expo start --web instead
npx expo start --web
# This command requires Expo CLI.
# Do you want to install it globally [Y/n]? Y
# Installing the package 'expo-cli'...
```
