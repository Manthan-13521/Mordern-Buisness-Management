export default function ChartSkeleton() {
    return (
        <div className="relative overflow-hidden rounded-xl bg-white px-4 pb-12 pt-5 shadow sm:px-6 sm:pt-6 bg-background border border-gray-100 dark:border-gray-800 animate-pulse">
            <div>
                <div className="absolute rounded-md bg-gray-200 bg-white dark:bg-white/5 dark:backdrop-blur-md dark:border dark:border-white/10 shadow-lg h-12 w-12 p-3"></div>
                <div className="ml-16 h-4 w-24 bg-gray-200 bg-white dark:bg-white/5 dark:backdrop-blur-md dark:border dark:border-white/10 shadow-lg rounded"></div>
            </div>
            <div className="ml-16 mt-4 pb-6 sm:pb-7 flex items-baseline">
                <div className="h-8 w-16 bg-gray-200 bg-white dark:bg-white/5 dark:backdrop-blur-md dark:border dark:border-white/10 shadow-lg rounded"></div>
            </div>
        </div>
    );
}
