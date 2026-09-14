// MUI Imports
import InitColorSchemeScript from '@mui/material/InitColorSchemeScript'

// Third-party Imports
import 'react-perfect-scrollbar/dist/css/styles.css'

// Util Imports
import { getSystemMode } from '@core/utils/serverHelpers'

// Style Imports
import '@/app/globals.css'

// Generated Icon CSS Imports
import '@assets/iconify-icons/generated-icons.css'
import StoreProvider from '@/store/StoreProvider'

import PageTitleUpdater from '@/components/PageTitleUpdater'

export const metadata = {
  title: {
    template: 'Xbus Office - %s',
    default: 'Xbus Office'
  }
}

const RootLayout = async props => {
  const { children } = props

  // Vars
  const systemMode = await getSystemMode()
  const direction = 'ltr'

  return (
    <html id='__next' lang='en' dir={direction} suppressHydrationWarning>
      <body className='flex is-full min-bs-full flex-auto flex-col'>
        <InitColorSchemeScript attribute='data' defaultMode={systemMode} />
        <PageTitleUpdater />
        <StoreProvider>{children}</StoreProvider>
      </body>
    </html>
  )
}

export default RootLayout
