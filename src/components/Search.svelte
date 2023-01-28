<script>

    import { createEventDispatcher } from "svelte";
    
    let rollText 
    let dispatch = createEventDispatcher()


    const rollUp =()=>{
        dispatch("rollUp", rollText)
    }

</script>

<div class="w-full h-1/6 flex items-center justify-center flex-row pr-10 pl-10">
    <input bind:value={rollText} class="f1 w-full h-14 border-2 border-red-400 rounded bg-gray-900 p-3 text-xl text-white" placeholder="Roll me some where .."/>
    <button on:click={rollUp} class="f1 bg-red-400 h-14 w-20 text-center ml-2 rounded text-white text-xl">Roll</button>
</div>