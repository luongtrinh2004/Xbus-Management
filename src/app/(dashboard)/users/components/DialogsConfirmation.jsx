// React Imports
import { forwardRef } from 'react'

// MUI Imports

import Button from '@mui/material/Button'
import Dialog from '@mui/material/Dialog'
import DialogTitle from '@mui/material/DialogTitle'
import DialogContent from '@mui/material/DialogContent'
import DialogActions from '@mui/material/DialogActions'
import DialogContentText from '@mui/material/DialogContentText'
import Slide from '@mui/material/Slide'

const Transition = forwardRef(function Transition(props, ref) {
  return <Slide direction='up' ref={ref} {...props} />
})

const DialogsConfirmation = ({ open, setOpen, deleteUser, choosingId, setChoosingId }) => {
  const handleClose = () => setOpen(false)

  return (
    <Dialog
      open={open}
      keepMounted
      onClose={handleClose}
      TransitionComponent={Transition}
      aria-labelledby='alert-dialog-slide-title'
      aria-describedby='alert-dialog-slide-description'
      closeAfterTransition={false}
    >
      <DialogTitle id='confirm-dialog-title'>Xác nhận xóa người dùng</DialogTitle>
      <DialogContent>
        <DialogContentText id='confirm-dialog-description'>
          Bạn có chắc chắn muốn xóa người dùng này không? Hành động này không thể hoàn tác.
        </DialogContentText>
      </DialogContent>
      <DialogActions>
        <Button onClick={handleClose} color='secondary'>
          Hủy
        </Button>
        <Button
          onClick={() => {
            deleteUser(choosingId)
            setChoosingId('')
            setOpen(false)
          }}
          color='error'
        >
          Xóa
        </Button>
      </DialogActions>
    </Dialog>
  )
}

export default DialogsConfirmation
