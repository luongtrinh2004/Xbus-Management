const card = skin => {
  return {
    MuiCard: {
      defaultProps: {
        ...(skin === 'bordered' && {
          variant: 'outlined'
        })
      },
      styleOverrides: {
        root: ({ ownerState }) => ({
          ...(ownerState.variant !== 'outlined' && {
            boxShadow: 'var(--mui-customShadows-md)'
          })
        })
      }
    },
    MuiCardHeader: {
      styleOverrides: {
        root: ({ theme }) => ({
          padding: theme.spacing(6),
          minInlineSize: 0,
          [theme.breakpoints.down('sm')]: {
            padding: theme.spacing(4),
            flexDirection: 'column',
            alignItems: 'stretch',
            gap: theme.spacing(3),
            '& .MuiCardHeader-action': {
              alignSelf: 'stretch',
              margin: 0
            }
          },
          '& + .MuiCardContent-root, & + .MuiCardActions-root': {
            paddingBlockStart: 0
          },
          '& + .MuiCollapse-root .MuiCardContent-root:first-child, & + .MuiCollapse-root .MuiCardActions-root:first-child':
            {
              paddingBlockStart: 0
            }
        }),
        subheader: ({ theme }) => ({
          ...theme.typography.subtitle1,
          color: 'rgb(var(--mui-palette-text-primaryChannel) / 0.55)'
        }),
        action: ({ theme }) => ({
          ...theme.typography.body1,
          color: 'var(--mui-palette-text-disabled)',
          marginBlock: 0,
          marginInlineEnd: 0,
          '& .MuiIconButton-root': {
            color: 'inherit'
          }
        })
      }
    },
    MuiCardContent: {
      styleOverrides: {
        root: ({ theme }) => ({
          padding: theme.spacing(6),
          [theme.breakpoints.down('sm')]: { padding: theme.spacing(4) },
          color: 'var(--mui-palette-text-secondary)',
          '&:last-child': {
            paddingBlockEnd: theme.spacing(6),
            [theme.breakpoints.down('sm')]: { paddingBlockEnd: theme.spacing(4) }
          },
          '& + .MuiCardHeader-root, & + .MuiCardContent-root, & + .MuiCardActions-root': {
            paddingBlockStart: 0
          },
          '& + .MuiCollapse-root .MuiCardHeader-root:first-child, & + .MuiCollapse-root .MuiCardContent-root:first-child, & + .MuiCollapse-root .MuiCardActions-root:first-child':
            {
              paddingBlockStart: 0
            }
        })
      }
    },
    MuiCardActions: {
      styleOverrides: {
        root: ({ theme }) => ({
          padding: theme.spacing(6),
          flexWrap: 'wrap',
          gap: theme.spacing(2),
          '& .MuiButtonBase-root:not(:first-of-type)': {
            marginInlineStart: theme.spacing(4),
            [theme.breakpoints.down('sm')]: { marginInlineStart: 0 }
          },
          [theme.breakpoints.down('sm')]: {
            padding: theme.spacing(4),
            '& .MuiButtonBase-root': { flex: '1 1 auto' }
          },
          '&:where(.card-actions-dense)': {
            padding: theme.spacing(3),
            '& .MuiButton-text': {
              paddingInline: theme.spacing(3)
            }
          },
          '& + .MuiCardHeader-root, & + .MuiCardContent-root, & + .MuiCardActions-root': {
            paddingBlockStart: 0
          },
          '& + .MuiCollapse-root .MuiCardHeader-root:first-child, & + .MuiCollapse-root .MuiCardContent-root:first-child, & + .MuiCollapse-root .MuiCardActions-root:first-child':
            {
              paddingBlockStart: 0
            }
        })
      }
    }
  }
}

export default card
