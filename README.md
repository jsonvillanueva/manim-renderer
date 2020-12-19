# manim-renderer

## To run a prebuilt app
* Navigate to the [actions tab](https://github.com/ManimCommunity/manim-renderer/actions) and choose your desired commit
* Download the appropriate build for your operating system in the Artifacts section

**On MacOS** The zip file will contain a .dmg file. The first time you run the app you'll see a window saying that the developer cannot be verified. Apple's verification process requires purchasing a $100 certificate (which is annually recurring), so we've opted not to do it. You can still run the renderer by following the instructions [here](https://support.apple.com/en-us/HT202491) in the section labeled "How to open an app that hasn’t been notarized or is from an unidentified developer".

**On Linux** The zip file will contain a .AppImage file. Before running the file you'll have to mark it as executable with `chmod +x manim-renderer-<version>.AppImage`.

## To develop
* Install dependencies: `yarn install`
* Compile and run with hot reloading: `yarn electron:serve`

## To package
`yarn electron:build`

You can also lint and fix files with `yarn lint`.

### Customize configuration
See [Configuration Reference](https://cli.vuejs.org/config/).
