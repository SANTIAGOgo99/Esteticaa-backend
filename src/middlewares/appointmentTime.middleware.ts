import { NextFunction, Request, Response } from 'express';
import { getLocalNow, normalizeLocalDateTime } from '../services/agenda.service';

export const rejectStartedAppointment = (req: Request, res: Response, next: NextFunction) => {
  const rawAppointmentDate = req.body?.appointment_date;
  if (!rawAppointmentDate) {
    next();
    return;
  }

  const appointmentLocal = normalizeLocalDateTime(String(rawAppointmentDate));
  if (!appointmentLocal) {
    next();
    return;
  }

  const nowLocal = getLocalNow();
  if (appointmentLocal <= nowLocal) {
    res.status(409).json({
      message: 'Ese horario ya comenzó o ya pasó. Selecciona un horario posterior a la hora actual.',
      code: 'PAST',
      appointment_local: appointmentLocal,
      local_now: nowLocal,
    });
    return;
  }

  next();
};
