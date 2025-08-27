import React, { useState } from 'react';
import Schedule from './components/Schedule';
import { Schedule as ScheduleType } from '../../types/schedule';
import { findCommonBreaks } from '../../utils/timeUtils';
import './Scheduler.scss';

// Sample data for demonstration
const sampleSchedules: ScheduleType[] = [
	{
		id: '1',
		name: 'My Schedule',
		events: [
			{
				id: '1',
				title: 'Math 101',
				startTime: '09:00',
				endTime: '10:30',
				color: '#3b82f6',
				location: 'Room 101',
			},
			{
				id: '2',
				title: 'Physics Lab',
				startTime: '11:00',
				endTime: '12:30',
				color: '#ef4444',
				location: 'Lab A',
			},
			{
				id: '3',
				title: 'Literature',
				startTime: '14:00',
				endTime: '15:30',
				color: '#10b981',
				location: 'Room 205',
			},
			{
				id: '4',
				title: 'Study Group',
				startTime: '16:00',
				endTime: '17:00',
				color: '#f59e0b',
				location: 'Library',
			},
		],
	},
	{
		id: '2',
		name: "Friend's Schedule",
		events: [
			{
				id: '5',
				title: 'Chemistry',
				startTime: '08:30',
				endTime: '10:00',
				color: '#8b5cf6',
				location: 'Lab B',
			},
			{
				id: '6',
				title: 'English',
				startTime: '10:30',
				endTime: '12:00',
				color: '#06b6d4',
				location: 'Room 150',
			},
			{
				id: '7',
				title: 'History',
				startTime: '13:00',
				endTime: '14:30',
				color: '#f97316',
				location: 'Room 301',
			},
			{
				id: '8',
				title: 'Art Class',
				startTime: '15:00',
				endTime: '16:30',
				color: '#ec4899',
				location: 'Art Studio',
			},
		],
	},
];

const Scheduler: React.FC = () => {
	const [selectedSchedules, setSelectedSchedules] = useState<ScheduleType[]>(
		sampleSchedules.length > 0 ? [sampleSchedules[0]] : []
	);
	const [comparisonMode, setComparisonMode] = useState(false);
	const [startHour] = useState(8);
	const [endHour] = useState(17); // Reduced from 18 to 17 to fit better

	// Calculate common breaks when in comparison mode
	const commonBreaks =
		comparisonMode && selectedSchedules.length === 2 && selectedSchedules[0] && selectedSchedules[1]
			? findCommonBreaks(
					selectedSchedules[0].events,
					selectedSchedules[1].events
			  )
			: [];

	const toggleComparisonMode = () => {
		if (comparisonMode) {
			if (sampleSchedules.length > 0) {
				setSelectedSchedules([sampleSchedules[0]]);
			}
			setComparisonMode(false);
		} else {
			if (sampleSchedules.length >= 2) {
				setSelectedSchedules([sampleSchedules[0], sampleSchedules[1]]);
			}
			setComparisonMode(true);
		}
	};

	const handleScheduleSelect = (scheduleIndex: number, newScheduleId: string) => {
		const newSchedule = sampleSchedules.find((s) => s.id === newScheduleId);
		if (newSchedule) {
			const updated = [...selectedSchedules];
			updated[scheduleIndex] = newSchedule;
			setSelectedSchedules(updated);
		}
	};

	return (
		<div className="scheduler">
			<div className="scheduler__header">
				<h1 className="scheduler__title">Schedule Viewer</h1>
				<div className="scheduler__controls">
					<button
						className={`scheduler__toggle ${
							comparisonMode ? 'scheduler__toggle--active' : ''
						}`}
						onClick={toggleComparisonMode}
					>
						{comparisonMode ? 'Single View' : 'Compare'}
					</button>
				</div>
			</div>

			{comparisonMode && (
				<div className="scheduler__selector">
					{selectedSchedules.map((selected, index) => (
						<div key={index} className="scheduler__select-group">
							<label className="scheduler__select-label">
								Schedule {index + 1}:
							</label>
							<select
								value={selected.id}
								onChange={(e) =>
									handleScheduleSelect(index, e.target.value)
								}
								className="scheduler__select"
							>
								{sampleSchedules.map((schedule) => (
									<option key={schedule.id} value={schedule.id}>
										{schedule.name}
									</option>
								))}
							</select>
						</div>
					))}
					{commonBreaks.length > 0 && (
						<div className="scheduler__break-info">
							<span className="scheduler__break-count">
								{commonBreaks.length} free time
								{commonBreaks.length !== 1 ? 's' : ''} found
							</span>
						</div>
					)}
				</div>
			)}

			<div className="scheduler__content">
				<div className="scheduler__schedules">
					{selectedSchedules.map((schedule, index) => (
						<Schedule
							key={`${schedule.id}-${index}`}
							schedule={schedule}
							startHour={startHour}
							endHour={endHour}
							breakPeriods={commonBreaks}
							showBreaks={comparisonMode && index === 0}
						/>
					))}
				</div>
			</div>
		</div>
	);
};

export default Scheduler;
