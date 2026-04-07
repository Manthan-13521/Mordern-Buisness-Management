export function Testimonials() {
  const testimonials = [
    {
       body: "Switching to AquaSync saved our front-desk almost 15 hours a week. The automated payment reminders alone paid for the software.",
       author: {
         name: "Vikram R.",
         role: "Facility Manager, Sunset Pools",
       }
    },
    {
       body: "Managing 120 beds used to be a nightmare of spreadsheets. Now, with the drag-and-drop allocation and pending dues tracking, it's completely seamless.",
       author: {
         name: "Aman Gupta",
         role: "Owner, Premium Hostels",
       }
    }
  ];

  return (
    <section className="bg-gray-50 dark:bg-transparent py-24 sm:py-32">
       <div className="mx-auto max-w-7xl px-6 lg:px-8">
         <div className="mx-auto max-w-xl text-center">
           <h2 className="text-lg font-semibold leading-8 tracking-tight text-blue-600 dark:text-blue-500">Testimonials</h2>
           <p className="mt-2 text-3xl font-bold tracking-tight text-gray-900 dark:text-white sm:text-4xl">
             Loved by facility managers
           </p>
         </div>
         <div className="mx-auto mt-16 flow-root max-w-2xl sm:mt-20 lg:mx-0 lg:max-w-none">
            <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:gap-12">
               {testimonials.map((testimonial, idx) => (
                 <div key={idx} className="bg-white dark:bg-white/5 dark:backdrop-blur-md rounded-3xl p-8 shadow-sm ring-1 ring-gray-200 dark:ring-white/10 dark:border dark:border-white/10 group hover:-translate-y-1 transition-transform">
                   <blockquote className="text-gray-900 dark:text-gray-300">
                     <p className="text-lg font-semibold leading-8 tracking-tight">"{testimonial.body}"</p>
                   </blockquote>
                   <figcaption className="mt-6 flex items-center gap-x-4">
                     <div className="h-12 w-12 rounded-full bg-gray-200 dark:bg-gray-700/50 flex items-center justify-center font-bold text-gray-500 dark:text-gray-400">
                        {testimonial.author.name.charAt(0)}
                     </div>
                     <div>
                       <div className="font-semibold text-gray-900 dark:text-white">{testimonial.author.name}</div>
                       <div className="text-sm leading-6 text-gray-600 dark:text-gray-400">{testimonial.author.role}</div>
                     </div>
                   </figcaption>
                 </div>
               ))}
            </div>
         </div>
       </div>
    </section>
  );
}
