import type { Preview } from "@storybook/react"
import { ThemeProvider } from "../src/theme"
import "../src/styles/tailwind/index.css"

const preview: Preview = {
  decorators: [
    (Story) => (
      <ThemeProvider>
        <div className="p-6">
          <Story />
        </div>
      </ThemeProvider>
    ),
  ],
}

export default preview
