import type { Request, Response } from 'express';
import { ProjectModel } from '../models/project.js';
import { TaskModel } from '../models/task.js';
import { ActivityLogModel } from '../models/activity-log.js';
import { respond } from '../utils/api.js';
export const dashboard = async (req: Request, res: Response) => {
  const userId = req.user!.id;
  const projects = await ProjectModel.find({
    $or: [{ owner: userId }, { members: userId }],
    archivedAt: null,
  })
    .sort({ updatedAt: -1 })
    .limit(6);
  const projectIds = projects.map((project) => project.id);
  // const completedByProject = await Promise.all(
  //   projects.map((project) => TaskModel.countDocuments({ project: project.id, status: 'done' })),
  // );

  // const [assignedTasks, activity] = await Promise.all([
  //   TaskModel.find({ assignee: userId, status: { $ne: 'done' } })
  //     .populate('project', 'name key')
  //     .sort({ dueDate: 1 })
  //     .limit(8),
  //   ActivityLogModel.find({ project: { $in: projectIds } })
  //     .populate('actor', 'name avatarUrl')
  //     .populate('project', 'name key')
  //     .sort({ createdAt: -1 })
  //     .limit(10),
  // ]);
  const [completedCounts, assignedTasks, activity] = await Promise.all([
    TaskModel.aggregate<{ _id: string; count: number }>([
      { $match: { project: { $in: projectIds }, status: 'done' } },
      { $group: { _id: '$project', count: { $sum: 1 } } },
    ]),
    TaskModel.find({ assignee: userId, status: { $ne: 'done' } })
      .populate('project', 'name key')
      .sort({ dueDate: 1 })
      .limit(8),
    ActivityLogModel.find({ project: { $in: projectIds } })
      .populate('actor', 'name avatarUrl')
      .populate('project', 'name key')
      .sort({ createdAt: -1 })
      .limit(10),
  ]);
  return respond(res, 200, 'Dashboard retrieved', {
    statistics: {
      projects: projects.length,
      assignedTasks: assignedTasks.length,
      completedTasks: completedCounts.reduce((total, entry) => total + entry.count, 0),
    },
    projects,
    assignedTasks,
    activity,
  });
};
