// Component Imports
import Unauthorized from '@views/Unauthorized'

// Server Action Imports
import { getServerMode } from '@core/utils/serverHelpers'

export const metadata = {
    title: 'Unauthorized'
}

const UnauthorizedPage = async () => {
    // Vars
    const mode = await getServerMode()

    return <Unauthorized mode={mode} />
}

export default UnauthorizedPage
