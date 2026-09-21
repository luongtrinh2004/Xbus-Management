const dialog = skin => ({
  MuiDialog: {
    styleOverrides: {
      paper: ({ theme }) => ({
        borderRadius: 'var(--mui-shape-customBorderRadius-lg)',
        ...(skin !== 'bordered'
          ? {
              boxShadow: 'var(--mui-customShadows-lg)'
            }
          : {
              boxShadow: 'none'
            }),
        [theme.breakpoints.down('sm')]: {
          '&:not(.MuiDialog-paperFullScreen)': {
            margin: theme.spacing(3),
            inlineSize: 'calc(100% - 1.5rem)',
            maxInlineSize: 'calc(100% - 1.5rem)',
            maxBlockSize: 'calc(100% - 1.5rem)'
          }
        }
      }),
      paperFullScreen: {
        borderRadius: 0
      }
    }
  },
  MuiDialogTitle: {
    defaultProps: {
      variant: 'h5'
    },
    styleOverrides: {
      root: ({ theme }) => ({
        padding: theme.spacing(6),
        [theme.breakpoints.down('sm')]: { padding: theme.spacing(4) },
        '& + .MuiDialogActions-root': {
          paddingTop: 0
        }
      })
    }
  },
  MuiDialogContent: {
    styleOverrides: {
      root: ({ theme }) => ({
        padding: theme.spacing(6),
        [theme.breakpoints.down('sm')]: { padding: theme.spacing(4) },
        '& + .MuiDialogContent-root, & + .MuiDialogActions-root': {
          paddingTop: 0
        }
      })
    }
  },
  MuiDialogActions: {
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
        '&:where(.dialog-actions-dense)': {
          padding: theme.spacing(3),
          '& .MuiButton-text': {
            paddingInline: theme.spacing(3)
          }
        }
      })
    }
  }
})

export default dialog
