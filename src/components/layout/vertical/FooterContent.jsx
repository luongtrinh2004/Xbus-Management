'use client'

// Next Imports
import Link from 'next/link'

// Third-party Imports
import classnames from 'classnames'

// Util Imports
import { verticalLayoutClasses } from '@layouts/utils/layoutClasses'

const FooterContent = () => {
  return (
    <div className={classnames(verticalLayoutClasses.footerContent, 'flex items-center justify-end flex-wrap gap-4')}>
      <p>
        <span className='text-textSecondary'>{`© ${new Date().getFullYear()}, `}</span>
        <Link href='https://www.youtube.com/watch?v=Ugla2-LbdhY&list=RDUgla2-LbdhY&start_radio=1' target='_blank' className='text-primary'>
          Lương Trịnh - 22010064
        </Link>
      </p>
    </div>
  )
}

export default FooterContent
