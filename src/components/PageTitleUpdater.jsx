'use client'

import { useEffect } from 'react'
import { usePathname } from 'next/navigation'
import verticalMenuData from '@/data/navigation/verticalMenuData'

const PageTitleUpdater = () => {
    const pathname = usePathname()

    useEffect(() => {
        const findLabel = (items, path) => {
            for (const item of items) {
                // Match both exact path and paths that start with the item's href (for sub-pages)
                // But for exact matches, we prefer the most specific one.
                if (item.href === path) {
                    return item.label
                }
                if (item.children) {
                    const childLabel = findLabel(item.children, path)
                    if (childLabel) return childLabel
                }
            }
            return null
        }

        const label = findLabel(verticalMenuData, pathname)

        if (label) {
            document.title = `PheniCar - ${label}`
        } else {
            // Handle special cases or default
            if (pathname === '/login') {
                document.title = 'PheniCar - Đăng nhập'
            } else if (pathname === '/401') {
                document.title = 'PheniCar - Không có quyền'
            } else {
                document.title = 'PheniCar'
            }
        }
    }, [pathname])

    return null
}

export default PageTitleUpdater
